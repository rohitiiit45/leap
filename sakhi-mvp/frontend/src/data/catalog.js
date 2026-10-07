export const IMG = {
  rotti: "https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy%2Cf_auto%2Cq_auto/FOOD_CATALOG/IMAGES/CMS/2026/1/9/bfb2adc1-f5cc-4cfe-b5d0-2069b0d80ebf_40c65483-cddb-42c9-bf31-9734abf723a1.jpg",
  kasuti: "https://kaikrafts.wordpress.com/wp-content/uploads/2014/01/60268_424478357599483_884181077_n.jpg?w=584",
  pedha: "https://media.easemytrip.com/media/Blog/India/637002622910044343/637002622910044343iGyzCm.jpg",
  karadantu: "https://freshmills.in/cdn/shop/files/supreme-karadant-vijaya-karadant-freshmills-866036.png?v=1724216100&width=1214",
  ilkal: "https://media.indulgexpress.com/indulgexpress%2F2024-03%2Fb1f941e4-f66e-4c81-b516-b45f903b934c%2FIlkal_sari.jpg?auto=format%2Ccompress&w=640",
  weaving: "https://dsource.in/sites/default/files/resource/ilkal-saree-ilkal-bagalkot-karnataka/making-process/weaving/minigallery/11852/3.jpg",
  village: "https://media.assettype.com/deccanherald%2Fimport%2Fsites%2Fdh%2Ffiles%2Fgallery_images%2Ffile753v97hixfcniw4gad.jpg?w=undefined",
  ganesh: "https://bangaloremirror.indiatimes.com/thumb/msid-65788933%2Cwidth-1200%2Cheight-900%2Cresizemode-4/.jpg",
  laddu: "https://d3ox4wjkl7mf3m.cloudfront.net/recipe/YsaZhWwnB22SghAxbU5a7vn3AhPfdpPY987tYvs1.jpg",
  tulsi: "https://upload.wikimedia.org/wikipedia/commons/d/da/Ocimum_tenuiflorum.jpg",
  tulsi2: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Ocimum_tenuiflorum2.jpg",
  founder: "https://www.livemint.com/lm-img/img/2024/06/16/1600x900/Sumangala-credit-KT_1718521993104_1718522011430.jpg"
};
export const CAT_IMG = {
  "Home Food": [IMG.rotti, "🍛"], "Bakery & Sweets": [IMG.pedha, "🧁"], "Handmade Crafts": [IMG.kasuti, "🧵"],
  Clothing: [IMG.ilkal, "👗"], Jewellery: [IMG.weaving, "📿"], "Beauty & Wellness": [IMG.village, "🌿"],
  "Home & Decor": [IMG.weaving, "🏠"], "Pickles & Spices": [IMG.karadantu, "🌶️"], "Gifts & Festive": [IMG.ganesh, "🎁"], Plants: [IMG.tulsi, "🪴"]
};
// compact rows: name|by|place|price|image|emoji|badge
const mk = rows => rows.trim().split("\n").map(r => { const [name, by, place, price, img, emoji, badge] = r.split("|"); return { name, by, place, price, image: IMG[img], emoji, badge }; });
export const festive = mk(`
Handmade Ganesh idol|Local women artisans|Hubballi|From ₹299|ganesh|🙏|Eco-friendly
Festive laddus & modak|Home kitchens|Dharwad|From ₹199 / box|laddu|🍬|Freshly made
Kasuti festive gift|Women artisans|Dharwad|From ₹349|kasuti|🎁|Handmade
Return gift hampers|Sakhi Gift Studio|Gokul Road|From ₹499|weaving|🎀|`);
const S = [
 ["Home Food","Meals, snacks and traditional recipes made by local women",`
Dharwad pedha|Traditional milk sweet|Dharwad|₹260 / 250 g|pedha|🍬|Local favourite
Karadantu|Dry-fruit sweet|North Karnataka|₹320 / 250 g|karadantu|🍯|
Jolada rotti meal|Home-style kitchen|Hubballi|₹180 / meal|rotti|🫓|
Ghee laddus|Women-led home kitchen|Vidyanagar|₹199 / box|laddu|🟠|`],
 ["Bakery & Sweets","Fresh treats from neighbourhood home bakers",`
Nippattu|Crispy North Karnataka snack|Hubballi|₹160 / 250 g|rotti|🥨|
Khara mixture|Freshly packed|Dharwad|₹140 / 250 g|karadantu|🥜|
Coconut cookies|Home bakery|Vidyanagar|₹180 / box|laddu|🍪|
Mysore-style cake|Sakhi Bake House|Keshwapur|₹420|pedha|🍰|`],
 ["Kasuti & Crafts","Handmade work carrying North Karnataka craft traditions",`
Kasuti wall hoop|Hand embroidered|Dharwad|₹550|kasuti|🪡|
Handwoven table runner|Women weavers|Hubballi|₹750|weaving|🧶|
Clay diya set|Local artisan|Unkal|₹299 / set|ganesh|🪔|
Jute storage basket|Self-help group|Dharwad|₹480|village|🧺|`],
 ["Clothing","Ilkal, embroidery and locally stitched fashion",`
Ilkal saree|Handloom artisan|Ilkal · Hubballi|₹2,400|ilkal|🥻|Handloom
Kasuti embroidered stole|Dharwad women artisans|Dharwad|₹899|kasuti|🧣|Embroidery
Hand-woven saree fabric|Traditional loom|Ilkal|₹1,850|weaving|🧵|
Embroidered festive wear|Women tailors|Gokul Road|₹1,200|village|👗|`],
 ["Jewellery","Small-batch accessories made by women creators",`
Terracotta earrings|Handmade jewellery|Hubballi|₹299|kasuti|💎|
Beaded necklace|Women-led studio|Dharwad|₹599|weaving|📿|
Kasuti brooch|Embroidered accessory|Dharwad|₹249|village|✨|
Oxidised jhumka set|Sakhi Jewellery|Keshwapur|₹449|ilkal|👂|`],
 ["Beauty & Wellness","Everyday self-care from local makers",`
Herbal hair oil|Small-batch maker|Hubballi|₹220|village|🌿|
Natural bath powder|Women wellness brand|Dharwad|₹180|karadantu|🧴|
Handmade soap trio|Plant-based care|Vidyanagar|₹299|laddu|🧼|
Lip balm gift set|Local beauty studio|Hubballi|₹249|kasuti|💄|`],
 ["Home & Decor","Handmade pieces for your home",`
Kasuti cushion cover|Hand embroidered|Dharwad|₹650|kasuti|🛋️|
Woven wall basket|Women artisans|Hubballi|₹720|weaving|🧺|
Festive toran|Handmade decor|Dharwad|₹399|ganesh|🏠|
Macramé plant hanger|Local craft studio|Vidyanagar|₹520|village|🌿|`],
 ["Pickles & Spices","Family recipes, masalas and preserves",`
Guntur chilli powder|Small-batch spice maker|Hubballi|₹150 / 250 g|karadantu|🌶️|
North Karnataka masala|Family recipe|Dharwad|₹180 / pack|rotti|🧂|
Mango pickle|Homemade|Hubballi|₹220 / jar|laddu|🥭|
Lemon pickle|Traditional recipe|Dharwad|₹190 / jar|pedha|🍋|`],
 ["Gifts & Festive","Thoughtful gifts sourced from Sakhi businesses",`
Sakhi welcome hamper|Curated local products|Hubballi–Dharwad|₹799|ganesh|🎁|
Festival sweet box|Women home kitchens|Dharwad|₹499|laddu|🍬|
Craft & coffee hamper|Local makers|Hubballi|₹899|kasuti|☕|
Custom return gifts|Sakhi Gift Studio|Gokul Road|From ₹399|weaving|🎀|`],
 ["Plants","Green corners grown by local nurseries",`
Indoor money plant|Women-run nursery|Hubballi|₹199||🪴|
Tulsi planter|Local nursery|Dharwad|₹249|tulsi|🌱|
Succulent pot|Sakhi Greens|Vidyanagar|₹299||🌵|
Kitchen herb kit|Grow-at-home kit|Hubballi|₹349|tulsi2|🌿|`]
];
export const categorySections = S.map(([c, s, rows]) => [c, s, mk(rows)]);
