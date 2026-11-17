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
| `aistudio/dj-stage.png` | כנ"ל | "an empty raised wedding DJ stage platform… glowing cyan LED strip… two small steps", seed 7. **במראה אופקית** | `PROP_SPRITES.djStage`, scale 0.8 | 15 |
| `aistudio/dj-console.png` | כנ"ל | "a modern DJ booth console table… LED front panel faces the viewer on the bottom-left side", seed 7 | `PROP_SPRITES.djConsole`, scale 0.6 | 15 |

## תמונות רפרנס (מוצגות בחלונות, לא בעולם)

| קובץ | מה | איפה |
|---|---|---|
| `aistudio/images_2d9246ef.jpg` | מדפסת Mitsubishi | `MagnetWorkstationModal.tsx` |
| `aistudio/3507_100620211652394_138ea7bb.jpg` | חותך KW-triO | `MagnetWorkstationModal.tsx` |
| `aistudio/___-__-_______f37299ea.jpg` | לוח המגנטים | `MagnetBoardModal.tsx` |

## סה"כ יצירות PixelLab שנוצלו (נכון ל-17.11)

~370 מתוך 2,000 (נשארו ~1,630). בדיקת יתרה: `GET https://api.pixellab.ai/v2/balance`.

## הוספת נכס חדש — צ'ק-ליסט

1. הערכת עלות ואישור של שחר לפני שליחה ל-PixelLab.
2. שמירת הפלט הגולמי מחוץ לריפו; עיבוד בסקריפט ב-`tools/` (חיתוך, מראה, גיליון).
3. שם קובץ חדש ב-`public/assets/…` (גרסה בשם אם מחליפים קובץ קיים).
4. מדידה: עוגן / פינת קרקע + אורכי צלעות → קבוע ב-`venueProps.ts` או במודול של האזור.
5. שורה בטבלה כאן: מקור, פרומפט, seed, עלות, סקריפט, מיקום.
