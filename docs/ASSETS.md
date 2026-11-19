# נכסים גרפיים — מקור, פרומפט, עלות

> לכל קובץ ב-`public/assets/`: מאיפה הגיע, איך לייצר שוב, ואיזה סקריפט עיבד אותו.
> **מוסיפים שורה בכל נכס חדש**, ומחליפים שם קובץ בכל שינוי תוכן (קאש של GitHub Pages).
> שיטות ה-API של PixelLab ומחירים: ראו `CLAUDE.md` → "נכסים גרפיים". מפתח API — רק ב-`~/.secrets/pixellab_key`.

## הצלם (הדמות הראשית — הסטנדרט לכל הסגנון)

| קובץ | מה | מקור | עיבוד | הערות |
|---|---|---|---|---|
| `aistudio/photographer-walk4.png` | 6 עמודות × 8 שורות, תאים 352px: idle, walk_1, walk_2, shoot, walk_3, walk_4 | פריים idle: דמות PixelLab ב-8 כיוונים (מהגלריה של שחר). הליכה: רצועות Gemini לפי כיוון (S, SE, E, NE, N); W/SW/NW במראה | `tools/make_photographer_walk.py` | ~950KB, נטען מוקדם (`preload` ב-`index.html`) |
| `aistudio/photographer-shoot.png` | שורות N..NW, 9 עמודות × 352px: הרמת מצלמה → הבזק | 9 גיליונות אנימציית צילום מתיקיית PixelLab "magnetmania main carcter" | `tools/make_photographer_shoot.py` | **חסר כיוון N**. פריים הבזק: `SHOOT_FLASH_FRAME` |
| `aistudio/photographer-seated.jpg`, `photographer-cutting.jpg` | הצלם יושב / חותך בעמדה | גיליונות ישנים (לפני PixelLab) | — | להחליף בסגנון PixelLab |
| `aistudio/Gemini_Generated_Image_…_9de06393.jpg` | גיליון הצלם הישן | Gemini | — | **גיבוי בלבד** — נטען רק אם שני הגיליונות למעלה נכשלו (2.2MB) |

## דמויות

| קובץ | מה | מקור | פרומפט / פרמטרים | עלות |
|---|---|---|---|---|
| `characters/dj-rotations.png` | דיג'יי, 8 סיבובים (S,SE,E,NE,N,NW,W,SW), תאים 168px | PixelLab `create-character-pro`, `create_with_style`, רפרנס = פריים S של הצלם (168) | "Israeli wedding DJ, adult man about 30, short dark hair and trimmed beard, big black over-ear headphones around his neck, fitted black t-shirt, black jeans, white sneakers, silver watch…", seed 21. **Character ID:** `63a31281-1084-4458-a9d4-6dcfd8d79340` | 25 |
| `characters/dj-anim2.png` | 3 שורות × 9 פריימים, תאים 236px, רגליים ב-y=201: מיקסר / זריקה / קיו באוזנייה | PixelLab `characters/animations`, `v3`, כיוון south, על הדמות למעלה | מיקסר: "both hands on a DJ mixer… seamless loop" (seed 5). זריקה: "raises his right arm high… throws forward… empty hands" (seed 9). קיו: "Both hands on the DJ controller… one headphone cup…" (seed 13 — יצא יד על האוזן) | 7 לכל אחת |
| `characters/guest-man-suit-rotations.png` | אורח בסיס: גבר בחליפה נייבי, 8 סיבובים (S,SE,E,NE,N,NW,W,SW), תאים 168px. **עוד לא מחובר למשחק** | PixelLab `create-character-pro`, `create_with_style`, רפרנס = פריים S של הצלם (168) | "Israeli wedding guest, adult man about 35, short dark hair, clean-shaven, navy blue slim-fit suit, white shirt, thin dark tie, brown leather shoes, relaxed standing pose", seed 21. **Character ID:** `464b5f8e-55b4-441a-9993-32e70bdcc031`. התמונות נשלפו מתשובת ה-job (`background-jobs/<id>` → `last_response.images`), כי backblaze.pixellab.ai חסום בסביבה; גיליון: `tools/make_rotation_sheet.py` | 25 |
| `aistudio/wedding-cast.png` | אורחים, חתן וכלה, משפחה (הגיליון הישן) | לפני PixelLab | — | **עדיפות #1 להחלפה** (ראו יומן) |

נפסלו (לא בריפו): מפיות "מתפוצצות" (v3, seed 5), אוזנייה בין כתף לאוזן (v3, seed 31).

## רכבים

| קובץ | מקור | פרמטרים | עיבוד | עלות |
|---|---|---|---|---|
| `aistudio/car-closed.png`, `car-open.png` | תמונות PixelLab של שחר (רכב הצלם) | — | `tools/make_car_sprites.py` (הסרת רקע משובץ ב-flood fill) | — |
| `aistudio/parked-white.png` | PixelLab `generate-with-style-v2`, רפרנס `car-closed.png` | "a white four-door sedan car, parked, isometric 3/4 top-down view seen from the rear-left exactly like the reference car…", seed 7 | `tools/make_parked_cars.py` (חיתוך) | 15 |
| `aistudio/parked-{black-suv,red-hatch,silver-van,blue-hybrid,yellow-taxi,beige-sedan}.png` | אותו דבר, רק הרכב בתיאור מתחלף | seed 11 | `tools/make_parked_cars.py` (למונית: כתם לבן → צל) | 15 כל אחד |

## חפצים ומבנים

| קובץ | מקור | פרמטרים | מיקום במשחק | עלות |
|---|---|---|---|---|
| `aistudio/chuppah-pool.png` | `generate-with-style-v2`, קנבס 448, רפרנס = 2 רכבים | "a Jewish wedding chuppah… round raised white marble stage… round turquoise water pool… white arched footbridge… toward the top-left", seed 17 (גרסה 2; seed 3 נפסלה) | `chuppahIsland.ts`: עוגן 223,298, 1:1, עמוד קדמי כשכבה נפרדת | 25 (+25 לגרסה שנפסלה) |
| `aistudio/bar.png` | `generate-with-style-v2`, רפרנס `car-closed.png` | "an elegant outdoor wedding cocktail bar… walnut wood front and a white marble top… backlit bottles and warm string bulbs", seed 7 | `venueProps.ts` `PROP_SPRITES.bar`, scale 0.95, גן קבלת הפנים | 15 |
| `aistudio/room-vanity.png` | שולחן איפור לכלה עם מראה מוארת וכיסא. PixelLab `generate-with-style-v2`, רפרנס `car-closed.png` (270×181) | "a bridal makeup vanity table in white and blush pink, a large mirror on top framed by glowing round light bulbs…" + "isometric 3/4 top-down view… single object, no floor, no shadow", seed 7 | `tools/make_room_props.py` (ניקוי נקודות, חיתוך, מדידה); `venueRooms.ts` `ROOM_SPRITES` | 15 |
| `aistudio/room-sofa.png` | ספת קטיפה ורודה. PixelLab `generate-with-style-v2`, רפרנס `car-closed.png` (270×181) | "a luxurious blush-pink velvet loveseat sofa with gold legs…" + "isometric 3/4 top-down view… single object, no floor, no shadow", seed 7 | `tools/make_room_props.py` (ניקוי נקודות, חיתוך, מדידה); `venueRooms.ts` `ROOM_SPRITES` | 15 |
| `aistudio/room-flowers.png` | זר על עמוד. PixelLab `generate-with-style-v2`, רפרנס `car-closed.png` (270×181) | "a tall white pedestal stand with a lush wedding flower arrangement of white roses and pink peonies…" + "isometric 3/4 top-down view… single object, no floor, no shadow", seed 7 | `tools/make_room_props.py` (ניקוי נקודות, חיתוך, מדידה); `venueRooms.ts` `ROOM_SPRITES` | 15 |
| ~~`aistudio/room-sinks-mirror.png`~~ | **נמחק (18.11)** — הוחלף באי כיורים במרכז החדר (`room-island.png`) | — | — | 15 |
| `aistudio/room-accessible.png` | תא שירותים לנכים: אסלה, מאחזי יד, כיור נמוך. PixelLab `generate-with-style-v2`, רפרנס `car-closed.png` (270×181) | "an accessible wheelchair restroom corner: white toilet with chrome grab bars, low wall-mounted sink…" + "isometric 3/4 top-down view… single object, no floor, no shadow", seed 7 | `tools/make_room_props.py` (ניקוי נקודות, חיתוך, מדידה); `venueRooms.ts` `ROOM_SPRITES` | 15 |
| `aistudio/room-island.png` | אי כיורים כפול עם ברזים (במרכז חדר השירותים). PixelLab `generate-with-style-v2`, רפרנס `car-closed.png` (270×181) | "a freestanding white marble double-sided sink island with chrome faucets…" + "isometric 3/4 top-down view… single object, no floor, no shadow", seed 7 | `tools/make_room_props.py` (ניקוי נקודות, חיתוך, מדידה); `venueRooms.ts` `ROOM_SPRITES` | 15 |
| `aistudio/room-dryer.png` | מייבש ידיים על הקיר. PixelLab `generate-with-style-v2`, רפרנס `car-closed.png` (270×181) | "a wall-mounted stainless steel hand dryer…" + "isometric 3/4 top-down view… single object, no floor, no shadow", seed 7 | `tools/make_room_props.py` (ניקוי נקודות, חיתוך, מדידה); `venueRooms.ts` `ROOM_SPRITES` | 15 |
| `aistudio/room-plant.png` | עציץ קישוט (שירותים, מסדרון). PixelLab `generate-with-style-v2`, רפרנס `car-closed.png` (270×181) | "a decorative potted green plant in a white ceramic pot…" + "isometric 3/4 top-down view… single object, no floor, no shadow", seed 7 | `tools/make_room_props.py` (ניקוי נקודות, חיתוך, מדידה); `venueRooms.ts` `ROOM_SPRITES` | 15 |
| `aistudio/station-table.png` | שולחן מתקפל לבן (שולחן העבודה בעמדת המגנטים, לפי תמונה ששחר שלח). PixelLab `generate-with-style-v2`, רפרנס `car-closed.png` (270×181), seed 7, מראה אופקית (הציר הארוך לאורך x) | "a single white plastic folding banquet table, long rectangular 6 foot table, smooth white top with rounded corners, dark gray metal folding legs, empty table top, isometric 3/4 top-down view…" | `tools/make_station_table.py`; `src/render/workstationDesk.ts` `STATION_TABLE` (s 0.56 ≈ 106×40, גובה ≈ 37) | 15 |
| `aistudio/chair-crossback-front.png`, `aistudio/chair-crossback-back.png` | כיסא עץ עם גב איקס וכרית בז' (סגנון כל הכיסאות באולם, לפי תמונה ששחר שלח). שני מבטים: מלפנים (פונה למטה-שמאלה) ומאחור (פונה למעלה-ימינה); מראה אופקית נותנת את שני הכיוונים האחרים. PixelLab `generate-with-style-v2`, רפרנס `car-closed.png` (270×181), seed 7 | "a single wooden cross-back wedding chair (crossback bistro chair), honey-brown wood, X-shaped cross in the backrest, curved top rail… beige cushion on the seat, seen from the front-left / seen from behind…" | ניקוי `keep_big_parts` מ-`tools/make_room_props.py` + חיתוך; `src/render/workstationChair.ts` `CROSSBACK_CHAIR` (עוגן = מרכז ארבע הרגליים) | 30 |
| `aistudio/room-stall.png` | תא שירותים (משמש פעמיים). PixelLab `generate-with-style-v2`, רפרנס `car-closed.png` (270×181) | "a single restroom toilet stall cubicle with light grey partition walls and a closed grey door…" + "isometric 3/4 top-down view… single object, no floor, no shadow", seed 7 | `tools/make_room_props.py` (ניקוי נקודות, חיתוך, מדידה); `venueRooms.ts` `ROOM_SPRITES` | 15 |
| `aistudio/dj-stage.png` | כנ"ל | "an empty raised wedding DJ stage platform… glowing cyan LED strip… two small steps", seed 7. **במראה אופקית** | `PROP_SPRITES.djStage`, scale 0.8 | 15 |
| `aistudio/dj-console.png` | כנ"ל | "a modern DJ booth console table… LED front panel faces the viewer on the bottom-left side", seed 7 | `PROP_SPRITES.djConsole`, scale 0.6 | 15 |

## תמונות רפרנס (מוצגות בחלונות, לא בעולם)

| קובץ | מה | איפה |
|---|---|---|
| `aistudio/images_2d9246ef.jpg` | מדפסת Mitsubishi | `MagnetWorkstationModal.tsx` |
| `aistudio/3507_100620211652394_138ea7bb.jpg` | חותך KW-triO | `MagnetWorkstationModal.tsx` |
| `aistudio/___-__-_______f37299ea.jpg` | לוח המגנטים | `MagnetBoardModal.tsx` |

## סה"כ יצירות PixelLab שנוצלו (נכון ל-17.11)

~705 מתוך 2,000 (נשארו ~1,295 ב-19.11). בדיקת יתרה: `GET https://api.pixellab.ai/v2/balance`.

## הוספת נכס חדש — צ'ק-ליסט

1. הערכת עלות ואישור של שחר לפני שליחה ל-PixelLab.
2. שמירת הפלט הגולמי מחוץ לריפו; עיבוד בסקריפט ב-`tools/` (חיתוך, מראה, גיליון).
3. שם קובץ חדש ב-`public/assets/…` (גרסה בשם אם מחליפים קובץ קיים).
4. מדידה: עוגן / פינת קרקע + אורכי צלעות → קבוע ב-`venueProps.ts` או במודול של האזור.
5. שורה בטבלה כאן: מקור, פרומפט, seed, עלות, סקריפט, מיקום.
