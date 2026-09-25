from datetime import datetime, date, time
from decimal import Decimal, InvalidOperation
from flask import Blueprint, request, jsonify
from sqlalchemy import func

from models import db, Customer, Sale

bp = Blueprint("api", __name__, url_prefix="/api")


# ---------- helpers ----------
def _parse_decimal(value, field):
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError(f"{field} must be a number")


def _parse_datetime(value, field):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        raise ValueError(f"{field} must be ISO 8601 (e.g. 2024-01-15T10:30:00)")


# ---------- customers ----------
@bp.post("/customers")
def create_customer():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify(error="name is required"), 400

    c = Customer(name=name, phone=(data.get("phone") or None))
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201


@bp.delete("/customers/<int:customer_id>")
def delete_customer(customer_id):
    c = db.session.get(Customer, customer_id)
    if not c:
        return jsonify(error="customer not found"), 404
    db.session.delete(c)
    db.session.commit()
    return jsonify(deleted=True, id=customer_id), 200


@bp.get("/customers")
def list_customers():
    # Aggregate totals in one query
    rows = (
        db.session.query(
            Customer.id,
            Customer.name,
            Customer.phone,
            Customer.created_at,
            func.coalesce(func.sum(Sale.liters), 0).label("total_liters"),
            func.coalesce(func.sum(Sale.amount_paid), 0).label("total_paid"),
            func.max(Sale.sold_at).label("last_purchase"),
        )
        .outerjoin(Sale, Sale.customer_id == Customer.id)
        .group_by(Customer.id)
        .order_by(Customer.name)
        .all()
    )

    return jsonify([
        {
            "id": r.id,
            "name": r.name,
            "phone": r.phone,
            "created_at": r.created_at.isoformat(),
            "total_liters": float(r.total_liters),
            "total_paid": float(r.total_paid),
            "last_purchase": r.last_purchase.isoformat() if r.last_purchase else None,
        }
        for r in rows
    ])


# ---------- sales ----------
@bp.post("/sales")
def create_sale():
    data = request.get_json(silent=True) or {}
    try:
        customer_id = int(data.get("customer_id"))
    except (TypeError, ValueError):
        return jsonify(error="customer_id is required"), 400

    if not db.session.get(Customer, customer_id):
        return jsonify(error="customer not found"), 404

    try:
        liters = _parse_decimal(data.get("liters"), "liters")
        ppl = _parse_decimal(data.get("price_per_liter"), "price_per_liter")
        paid = _parse_decimal(data.get("amount_paid", 0), "amount_paid")
    except ValueError as e:
        return jsonify(error=str(e)), 400

    if liters <= 0 or ppl < 0 or paid < 0:
        return jsonify(error="liters must be > 0 and prices >= 0"), 400

    sold_at = _parse_datetime(data.get("sold_at"), "sold_at") or datetime.utcnow()

    s = Sale(
        customer_id=customer_id,
        liters=liters,
        price_per_liter=ppl,
        amount_paid=paid,
        sold_at=sold_at,
    )
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@bp.get("/sales")
def list_sales():
    q = Sale.query

    customer_id = request.args.get("customer_id")
    if customer_id:
        try:
            q = q.filter(Sale.customer_id == int(customer_id))
        except ValueError:
            return jsonify(error="customer_id must be an integer"), 400

    start = request.args.get("start")
    end = request.args.get("end")
    try:
        if start:
            q = q.filter(Sale.sold_at >= _parse_datetime(start, "start"))
        if end:
            q = q.filter(Sale.sold_at <= _parse_datetime(end, "end"))
    except ValueError as e:
        return jsonify(error=str(e)), 400

    sales = q.order_by(Sale.sold_at.desc()).all()
    return jsonify([s.to_dict() for s in sales])


@bp.get("/summary/daily")
def daily_summary():
    day_str = request.args.get("date")
    if day_str:
        try:
            day = date.fromisoformat(day_str)
        except ValueError:
            return jsonify(error="date must be YYYY-MM-DD"), 400
    else:
        day = datetime.utcnow().date()

    start = datetime.combine(day, time.min)
    end = datetime.combine(day, time.max)

    result = (
        db.session.query(
            func.coalesce(func.sum(Sale.liters), 0),
            func.coalesce(func.sum(Sale.amount_paid), 0),
            func.count(Sale.id),
        )
        .filter(Sale.sold_at >= start, Sale.sold_at <= end)
        .one()
    )

    total_liters, total_revenue, num_sales = result
    return jsonify({
        "date": day.isoformat(),
        "total_liters": float(total_liters),
        "total_revenue": float(total_revenue),
        "number_of_sales": int(num_sales),
    })