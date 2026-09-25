
import sys
import random
from datetime import datetime, timedelta
from decimal import Decimal

from app import app
from models import db, Customer, Sale


CUSTOMERS = [
    ("Alice Wanjiru", "+254712345678"),
    ("Brian Otieno", "+254723456789"),
    ("Catherine Mwangi", "+254734567890"),
    ("David Kipchoge", None),
    ("Esther Njeri", "+254745678901"),
    ("Francis Kamau", "+254756789012"),
    ("Grace Achieng", None),
    ("Henry Mutua", "+254767890123"),
]


def seed(reset=False):
    with app.app_context():
        if reset:
            print("Wiping existing data...")
            Sale.query.delete()
            Customer.query.delete()
            db.session.commit()

        # Create customers
        customers = []
        for name, phone in CUSTOMERS:
            c = Customer(name=name, phone=phone)
            db.session.add(c)
            customers.append(c)
        db.session.commit()
        print(f"Created {len(customers)} customers")

        # Create sales over the last 30 days
        today = datetime.utcnow()
        total_sales = 0

        for c in customers:
            # Each customer buys milk on ~60% of days
            num_purchases = random.randint(10, 22)
            purchase_days = random.sample(range(30), num_purchases)

            for day_offset in purchase_days:
                sold_at = (
                    today
                    - timedelta(days=day_offset)
                    - timedelta(hours=random.randint(0, 10))
                )

                liters = Decimal(str(round(random.uniform(0.5, 5.0), 2)))
                price_per_liter = Decimal("60.00")
                expected = liters * price_per_liter

                # 80% pay in full, 20% pay a round-ish partial amount
                if random.random() < 0.8:
                    amount_paid = expected
                else:
                    amount_paid = Decimal(str(round(float(expected) * random.uniform(0.5, 0.9), 0)))

                sale = Sale(
                    customer_id=c.id,
                    liters=liters,
                    price_per_liter=price_per_liter,
                    amount_paid=amount_paid,
                    sold_at=sold_at,
                )
                db.session.add(sale)
                total_sales += 1

        db.session.commit()
        print(f"Created {total_sales} sales across the last 30 days")

        # Quick summary
        from sqlalchemy import func
        litres = db.session.query(func.sum(Sale.liters)).scalar() or 0
        revenue = db.session.query(func.sum(Sale.amount_paid)).scalar() or 0
        print(f"Totals: {float(litres):.2f} L sold, KES {float(revenue):.2f} collected")


if __name__ == "__main__":
    reset = "--reset" in sys.argv
    seed(reset=reset)