import type { MenuCategory, MenuItem } from "@/lib/types";

export const CATEGORY_IMAGES: Record<MenuCategory, string> = {
  mixed_veg: "/menu/mixed-veg.jpg",
  paneer: "/menu/paneer.jpg",
  cheese: "/menu/cheese.jpg",
  fries: "/menu/fries.jpg",
  coffee: "/menu/coffee.jpg",
  shake: "/menu/shakes.jpg",
};

function dish(
  id: string,
  name: string,
  description: string,
  price: number,
  category: MenuCategory,
  tags?: string[],
): MenuItem {
  return {
    id,
    name,
    description,
    price,
    category,
    imageSrc: CATEGORY_IMAGES[category],
    tags,
    available: true,
  };
}

export const MENU_ITEMS: MenuItem[] = [
  dish("snd-veg-regular", "Regular Mixed Veg", "Classic veg sandwich with fresh veggies & creamy spread.", 99, "mixed_veg", ["veg"]),
  dish("snd-veg-peri", "Peri-Peri Sandwich", "Spicy peri-peri veggies with creamy sauce.", 109, "mixed_veg", ["veg"]),
  dish("snd-veg-makhani", "Makhani Sandwich", "Rich makhani-style filling with creamy touch.", 119, "mixed_veg", ["veg"]),
  dish("snd-veg-bbq", "Barbecue Sandwich", "Smoky BBQ veggies with tangy dressing.", 119, "mixed_veg", ["veg"]),
  dish("snd-veg-tandoori", "Tandoori Sandwich", "Tandoori-spiced veggies with creamy sauce.", 119, "mixed_veg", ["veg"]),
  dish("snd-veg-jalapeno", "Cheese Jalapeno Sandwich", "Cheesy & spicy jalapeno with creamy goodness.", 129, "mixed_veg", ["veg"]),
  dish("snd-veg-schezwan", "Schezwan Sandwich", "Schezwan veggies with a spicy kick.", 119, "mixed_veg", ["veg"]),
  dish("snd-veg-corn", "Corn Sandwich", "Sweet corn with veggies and creamy spread.", 109, "mixed_veg", ["veg"]),

  dish("snd-pnr-regular", "Regular Paneer", "Soft paneer with fresh veggies & creamy spread.", 129, "paneer", ["veg"]),
  dish("snd-pnr-peri", "Peri-Peri Paneer", "Peri-peri paneer with crunchy veggies.", 139, "paneer", ["veg"]),
  dish("snd-pnr-makhani", "Paneer Makhani", "Paneer in rich makhani sauce with veggies.", 149, "paneer", ["veg"]),
  dish("snd-pnr-tikka", "Paneer Tikka", "Tandoori paneer tikka with fresh veggies.", 149, "paneer", ["veg", "popular"]),
  dish("snd-pnr-jalapeno", "Paneer Jalapeno", "Spicy jalapeno with creamy paneer filling.", 149, "paneer", ["veg"]),
  dish("snd-pnr-schezwan", "Paneer Schezwan", "Spicy schezwan paneer with crunchy veggies.", 149, "paneer", ["veg"]),

  dish("snd-chc-chocolate", "Chocolate Cheese Sandwich", "Chocolate & cheese grilled to creamy perfection.", 139, "cheese", ["veg", "signature"]),
  dish("snd-chc-grilled", "Cheese Grilled Sandwich", "Loaded with melted cheese and grilled till gooey.", 129, "cheese", ["veg"]),

  dish("fry-salted", "Salted Fries", "Crispy & classic salted fries.", 89, "fries"),
  dish("fry-peri", "Peri-Peri Fries", "Spicy peri-peri seasoned fries.", 99, "fries"),
  dish("fry-chaat", "Chaat Masala Fries", "Tossed with chaat masala for a tangy kick.", 99, "fries", ["veg"]),
  dish("fry-loaded", "Loaded Fries", "Topped with sauce, veggies & cheese.", 129, "fries", ["popular"]),

  dish("cof-classic", "Classic Cold Coffee", "Smooth & refreshing.", 129, "coffee", ["iced"]),
  dish("cof-chocolate", "Chocolate Cold Coffee", "Rich chocolate indulgence.", 149, "coffee", ["iced"]),
  dish("cof-nutella", "Nutella Cold Coffee", "Nutella blended cold coffee.", 159, "coffee", ["iced"]),
  dish("cof-vanilla", "Vanilla Cold Coffee", "Vanilla flavour delight.", 149, "coffee", ["iced"]),

  dish("shk-oreo", "Oreo Shake", "Creamy Oreo crush shake.", 159, "shake"),
  dish("shk-kitkat", "KitKat Shake", "KitKat blended chocolate shake.", 159, "shake"),
  dish("shk-chocolate", "Chocolate Shake", "Thick & rich chocolate shake.", 149, "shake"),
];

export const CATEGORY_META: Record<
  MenuCategory,
  { label: string; plural: string; blurb: string }
> = {
  mixed_veg: {
    label: "Mixed veg sandwiches",
    plural: "sandwiches",
    blurb: "Fresh veggies, toasted till golden",
  },
  paneer: {
    label: "Paneer sandwiches",
    plural: "sandwiches",
    blurb: "Soft paneer, grilled at the counter",
  },
  cheese: {
    label: "Special cheese sandwiches",
    plural: "sandwiches",
    blurb: "Melted cheese, grilled till gooey",
  },
  fries: {
    label: "Fries",
    plural: "fries",
    blurb: "Salted, peri-peri, chaat, and loaded",
  },
  coffee: {
    label: "Iced coffees",
    plural: "coffees",
    blurb: "Cold coffee, blended and topped",
  },
  shake: {
    label: "Shakes",
    plural: "shakes",
    blurb: "Oreo, KitKat, and chocolate",
  },
};

export const CATEGORY_ORDER: MenuCategory[] = [
  "mixed_veg",
  "paneer",
  "cheese",
  "fries",
  "coffee",
  "shake",
];

export const SANDWICH_CATEGORIES: MenuCategory[] = ["mixed_veg", "paneer", "cheese"];
export const DRINK_CATEGORIES: MenuCategory[] = ["coffee", "shake"];

export function getMenuItem(id: string) {
  return MENU_ITEMS.find((item) => item.id === id);
}

export function getMenuByCategory(category?: MenuCategory) {
  if (!category) return MENU_ITEMS;
  return MENU_ITEMS.filter((item) => item.category === category);
}
