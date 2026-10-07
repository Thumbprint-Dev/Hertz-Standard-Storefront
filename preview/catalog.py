"""
PREVIEW-ONLY catalog for the local harness. Not Hertz data.

The product IDs follow the Hertz Four51 naming (one product per size, the size after the
brand segment), so the storefront's size grouping is exercised exactly as it will be against
the real catalog. Names, prices and stock levels are placeholders for the harness and never
leave this folder: the live site gets all of them from Four51.
"""

LETTER = ["XS", "S", "M", "L", "XL", "2XL", "3XL"]

# (category, base id, name, photo, sizes or None for one size, placeholder price)
FAMILIES = [
    ("polos", "HTZ-POLOSS-M-HZ", "Men's Short Sleeve Polo", "poloss-m", LETTER, 28.00),
    ("polos", "HTZ-POLOSS-W-HZ", "Women's Short Sleeve Polo", "poloss-w", LETTER, 28.00),
    ("polos", "HTZ-POLOLS-M-HZ", "Men's Long Sleeve Polo", "polols-m", LETTER, 32.00),
    ("polos", "HTZ-POLOLS-W-HZ", "Women's Long Sleeve Polo", "polols-w", LETTER, 32.00),
    ("bottoms", "HTZ-CARGOPANT-M-UV", "Men's Cargo Pant", "cargopant-m", ["30x30", "32x30", "32x32", "34x32", "36x32", "38x32"], 42.00),
    ("bottoms", "HTZ-CARGOPANT-W-UV", "Women's Cargo Pant", "cargopant-w", ["2", "4", "6", "8", "10", "12", "14"], 42.00),
    ("bottoms", "HTZ-CARGOSHORT-M-UV", "Men's Cargo Short", "cargoshort-m", ["30", "32", "34", "36", "38"], 34.00),
    ("bottoms", "HTZ-PERFPANT-W-UV", "Women's Performance Pant", "perfpant-w", ["2", "4", "6", "8", "10", "12"], 46.00),
    ("layering", "HTZ-QTZIP-M-HZ", "Quarter Zip Pullover", "qtzip-m", LETTER, 48.00),
    ("layering", "HTZ-FLZIP-W-HZ", "Women's Fleece Full Zip", "flzip-w", LETTER, 52.00),
    ("layering", "HTZ-SSHELL-US-HZ", "Soft Shell Jacket", "sshell-us", LETTER, 68.00),
    ("outerwear", "HTZ-PARKA-US-HZ", "Insulated Parka", "parka-us", LETTER, 120.00),
    ("accessories", "HTZ-RFHAT-HZ", "Reflective Cap", "rfhat", None, 16.00),
    ("accessories", "HTZ-BEANIE-HZ", "Knit Beanie", "beanie", None, 14.00),
    ("accessories", "HTZ-RFBLT-UV", "Reflective Belt", None, None, 18.00),
]

CATEGORIES = [
    ("polos", "Polos", "Short and long sleeve polos"),
    ("bottoms", "Pants & Shorts", "Cargo pants, shorts and performance pants"),
    ("layering", "Layering", "Quarter zips, fleece and soft shells"),
    ("outerwear", "Outerwear", "Parkas for cold weather"),
    ("accessories", "Accessories", "Caps, beanies and belts"),
]


def price_schedule(price):
    return {
        "ID": "preview-ps",
        "Name": "Preview",
        "OrderType": "Standard",
        "PriceBreaks": [{"Quantity": 1, "Price": price}],
        "MinQuantity": 1,
        "MaxQuantity": 0,
        "DefaultQuantity": 1,
        "RestrictedQuantity": False,
        "UseCumulativeQuantity": False,
    }


def product(interop, name, photo, price, category):
    image = "css/img/products/%s.png" % photo if photo else None
    return {
        "InteropID": interop,
        "ExternalID": interop,
        "Name": name,
        "Description": "<p>%s from the Hertz Shop. Placeholder description for the local preview.</p>" % name,
        "Type": "Static",
        "SmallImageURL": image,
        "LargeImageURL": image,
        "StandardPriceSchedule": price_schedule(price),
        "ReplenishmentPriceSchedule": None,
        "VariantCount": 0,
        "Variants": [],
        "Specs": {},
        "StaticSpecGroups": {},
        "IsVariantLevelInventory": False,
        "QuantityAvailable": 100,
        "DisplayInventory": False,
        "QuantityMultiplier": 1,
        "ShowSpecsWithVariantList": False,
        "_category": category,
    }


def build():
    products = []
    for category, base, name, photo, sizes, price in FAMILIES:
        if sizes:
            for size in sizes:
                products.append(product("%s-%s" % (base, size), name, photo, price, category))
        else:
            products.append(product(base, name, photo, price, category))
    categories = [
        {"InteropID": cid, "Name": name, "Description": desc, "SubCategories": [], "ParentInteropID": None}
        for cid, name, desc in CATEGORIES
    ]
    return categories, products
