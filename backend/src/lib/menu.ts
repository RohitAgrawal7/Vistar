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
  dish("snd-veg-regular", "Regular Mixed Veg", "Classic veg sandwich with fresh veggies & creamy spread.", 89, "mixed_veg", ["veg"]),
  dish("snd-veg-peri", "Peri-Peri Sandwich", "Spicy peri-peri veggies with creamy sauce.", 99, "mixed_veg", ["veg"]),
  dish("snd-veg-makhani", "Makhani Sandwich", "Rich makhani-style filling with creamy touch.", 99, "mixed_veg", ["veg"]),
  dish("snd-veg-bbq", "Barbecue Sandwich", "Smoky BBQ veggies with tangy dressing.", 99, "mixed_veg", ["veg"]),
  dish("snd-veg-tandoori", "Tandoori Sandwich", "Tandoori-spiced veggies with creamy sauce.", 99, "mixed_veg", ["veg"]),
  dish("snd-veg-jalapeno", "Cheese Jalapeno Sandwich", "Cheesy & spicy jalapeno with creamy goodness.", 99, "mixed_veg", ["veg"]),
  dish("snd-veg-schezwan", "Schezwan Sandwich", "Schezwan veggies with a spicy kick.", 99, "mixed_veg", ["veg"]),
  dish("snd-veg-corn", "Corn Sandwich", "Sweet corn with veggies and creamy spread.", 99, "mixed_veg", ["veg"]),
  dish("snd-pnr-regular", "Regular Paneer", "Soft paneer with fresh veggies & creamy spread.", 99, "paneer", ["veg"]),
  dish("snd-pnr-peri", "Peri-Peri Paneer", "Peri-peri paneer with crunchy veggies.", 109, "paneer", ["veg"]),
  dish("snd-pnr-makhani", "Paneer Makhani", "Paneer in rich makhani sauce with veggies.", 109, "paneer", ["veg"]),
  dish("snd-pnr-tikka", "Paneer Tikka", "Tandoori paneer tikka with fresh veggies.", 109, "paneer", ["veg", "popular"]),
  dish("snd-pnr-jalapeno", "Paneer Jalapeno", "Spicy jalapeno with creamy paneer filling.", 109, "paneer", ["veg"]),
  dish("snd-pnr-schezwan", "Paneer Schezwan", "Spicy schezwan paneer with crunchy veggies.", 109, "paneer", ["veg"]),
  dish("snd-chc-chocolate", "Chocolate Cheese Sandwich", "Chocolate & cheese grilled to creamy perfection.", 100, "cheese", ["veg", "signature"]),
  dish("snd-chc-grilled", "Cheese Grilled Sandwich", "Loaded with melted cheese and grilled till gooey.", 100, "cheese", ["veg"]),
  dish("fry-salted", "Salted Fries", "Crispy & classic salted fries.", 79, "fries"),
  dish("fry-peri", "Peri-Peri Fries", "Spicy peri-peri seasoned fries.", 89, "fries"),
  dish("fry-chaat", "Chaat Masala Fries", "Tossed with chaat masala for a tangy kick.", 89, "fries", ["veg"]),
  dish("fry-loaded", "Loaded Fries", "Topped with sauce, veggies & cheese.", 109, "fries", ["popular"]),
  dish("cof-classic", "Classic Cold Coffee", "Smooth & refreshing.", 79, "coffee", ["iced"]),
  dish("cof-chocolate", "Chocolate Cold Coffee", "Rich chocolate blended cold coffee.", 89, "coffee", ["iced"]),
  dish("cof-nutella", "Nutella Cold Coffee", "Nutella blended cold coffee.", 89, "coffee", ["iced"]),
  dish("cof-vanilla", "Vanilla Cold Coffee", "Vanilla flavour delight.", 89, "coffee", ["iced"]),
  dish("cof-hazelnut", "Hazelnut Cold Coffee", "Smooth hazelnut cold coffee.", 89, "coffee", ["iced"]),
  dish("shk-oreo", "Oreo Shake", "Creamy Oreo crush shake.", 129, "shake"),
  dish("shk-chocolate", "Chocolate Shake", "Thick & rich chocolate shake.", 129, "shake"),
];

export const SANDWICH_CATEGORIES: MenuCategory[] = ["mixed_veg", "paneer", "cheese"];
export const DRINK_CATEGORIES: MenuCategory[] = ["coffee", "shake"];

export function getMenuItem(id: string) {
  return MENU_ITEMS.find((item) => item.id === id);
}
