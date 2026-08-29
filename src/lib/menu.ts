import type { MenuCategory, MenuItem } from "@/lib/types";

export const CATEGORY_IMAGES: Record<string, string> = {
  combo: "/menu/board.jpg",
  mixed_veg: "/menu/mixed-veg.jpg",
  paneer: "/menu/paneer.jpg",
  cheese: "/menu/cheese.jpg",
  fries: "/menu/fries.jpg",
  coffee: "/menu/coffee.jpg",
  shake: "/menu/shakes.jpg",
};

export function categoryImage(category: string) {
  return CATEGORY_IMAGES[category] ?? "/menu/board.jpg";
}

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
    imageSrc: categoryImage(category),
    tags,
    available: true,
  };
}

function combo(
  id: string,
  name: string,
  description: string,
  price: number,
  images: [string, string, string],
  tags?: string[],
): MenuItem {
  return {
    id,
    name,
    description,
    price,
    category: "combo",
    imageSrc: images[0],
    comboImages: images,
    tags: ["combo", ...(tags ?? [])],
    available: true,
  };
}

export const MENU_ITEMS: MenuItem[] = [
  combo(
    "cmb-veg-classic",
    "Veg Classic Combo",
    "Mixed veg sandwich + salted fries + classic cold coffee.",
    279,
    ["/menu/mixed-veg.jpg", "/menu/fries.jpg", "/menu/coffee.jpg"],
    ["veg", "popular"],
  ),
  combo(
    "cmb-peri",
    "Peri-Peri Combo",
    "Peri-peri sandwich + peri-peri fries + chocolate cold coffee.",
    319,
    ["/menu/mixed-veg.jpg", "/menu/fries.jpg", "/menu/coffee.jpg"],
    ["veg"],
  ),
  combo(
    "cmb-paneer-tikka",
    "Paneer Tikka Combo",
    "Paneer tikka sandwich + loaded fries + nutella cold coffee.",
    369,
    ["/menu/paneer.jpg", "/menu/fries.jpg", "/menu/coffee.jpg"],
    ["veg", "popular"],
  ),
  combo(
    "cmb-makhani",
    "Makhani Combo",
    "Paneer makhani sandwich + chaat fries + vanilla cold coffee.",
    349,
    ["/menu/paneer.jpg", "/menu/fries.jpg", "/menu/coffee.jpg"],
    ["veg"],
  ),
  combo(
    "cmb-cheese-grilled",
    "Cheese Grilled Combo",
    "Cheese grilled sandwich + salted fries + classic cold coffee.",
    329,
    ["/menu/cheese.jpg", "/menu/fries.jpg", "/menu/coffee.jpg"],
    ["veg", "signature"],
  ),
  combo(
    "cmb-chocolate-cheese",
    "Chocolate Cheese Combo",
    "Chocolate cheese sandwich + peri fries + chocolate cold coffee.",
    359,
    ["/menu/cheese.jpg", "/menu/fries.jpg", "/menu/coffee.jpg"],
    ["veg"],
  ),

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

export const CATEGORY_META: Record<
  string,
  { label: string; plural: string; blurb: string }
> = {
  combo: {
    label: "Combos",
    plural: "combos",
    blurb: "Sandwich + fries + cold coffee together",
  },
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
    label: "Cold coffee",
    plural: "coffees",
    blurb: "Cold coffee and shakes",
  },
  shake: {
    label: "Shakes",
    plural: "shakes",
    blurb: "Oreo and chocolate",
  },
};

export const CATEGORY_ORDER: string[] = [
  "combo",
  "mixed_veg",
  "paneer",
  "cheese",
  "fries",
  "coffee",
  "shake",
];

export const SANDWICH_CATEGORIES: string[] = ["mixed_veg", "paneer", "cheese"];
export const DRINK_CATEGORIES: string[] = ["coffee", "shake"];

export type MenuShelf = string;

export const MENU_SHELVES: {
  id: MenuShelf;
  label: string;
  blurb?: string;
  categories: string[];
}[] = [
  {
    id: "sandwiches",
    label: "Sandwiches",
    blurb: "Mixed veg, paneer, and cheese",
    categories: SANDWICH_CATEGORIES,
  },
  {
    id: "fries",
    label: "Fries",
    blurb: "Salted, peri-peri, chaat, and loaded",
    categories: ["fries"],
  },
  {
    id: "coffee",
    label: "Cold coffee",
    blurb: "Cold coffee and shakes",
    categories: ["coffee", "shake"],
  },
  {
    id: "combo",
    label: "Combo",
    blurb: "Sandwich + fries + cold coffee together",
    categories: ["combo"],
  },
];

/** Known category ids that belong on the guest menu shelves. */
export const SHELF_CATEGORY_IDS = new Set(MENU_SHELVES.flatMap((shelf) => shelf.categories));

export function buildGuestShelves(activeCategoryIds: Set<string>) {
  const shelves = MENU_SHELVES.filter((shelf) =>
    shelf.categories.some((id) => activeCategoryIds.has(id)),
  ).map((shelf) => ({
    id: shelf.id,
    label: shelf.label,
    blurb: shelf.blurb ?? "",
    categories: shelf.categories.filter((id) => activeCategoryIds.has(id)),
  }));
  return shelves;
}

/** Default category records for seeding the live catalog. */
export function seedCategories(): import("@/lib/types").MenuCategoryRecord[] {
  return CATEGORY_ORDER.map((id, index) => {
    const meta = CATEGORY_META[id];
    return {
      id,
      label: meta?.label ?? id,
      blurb: meta?.blurb ?? "",
      imageSrc: categoryImage(id),
      sortOrder: index,
      active: true,
    };
  });
}

export function seedMenuItems(): MenuItem[] {
  return MENU_ITEMS.map((item, index) => ({ ...item, sortOrder: index }));
}

export function getMenuItem(id: string) {
  return MENU_ITEMS.find((item) => item.id === id);
}

export function getMenuByCategory(category?: MenuCategory) {
  if (!category) return MENU_ITEMS;
  return MENU_ITEMS.filter((item) => item.category === category);
}

export function getMenuByShelf(shelf: MenuShelf, availableIds?: Set<string>) {
  const categories = MENU_SHELVES.find((item) => item.id === shelf)?.categories ?? [];
  return MENU_ITEMS.filter(
    (item) =>
      categories.includes(item.category) &&
      item.available &&
      (!availableIds || availableIds.has(item.id)),
  );
}
