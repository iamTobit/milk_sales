from datetime import datetime, date
from decimal import Decimal
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Customer(db.Model):
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(30), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    sales = db.relationship(
        "Sale",
        backref="customer",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "created_at": self.created_at.isoformat(),
        }


class Sale(db.Model):
    __tablename__ = "sales"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(
        db.Integer,
        db.ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    liters = db.Column(db.Numeric(10, 2), nullable=False)
    price_per_liter = db.Column(db.Numeric(10, 2), nullable=False)
    amount_paid = db.Column(db.Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    sold_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "customer_name": self.customer.name if self.customer else None,
            "liters": float(self.liters),
            "price_per_liter": float(self.price_per_liter),
            "amount_paid": float(self.amount_paid),
            "sold_at": self.sold_at.isoformat(),
        }