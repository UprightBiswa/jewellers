# Adding 300 products without typing 300 forms

Rahul has the pieces photographed and a price on each tag. Entering them one at
a time through the admin is about three minutes each — fifteen hours for 300.
This is the route that takes an afternoon instead.

The template is [`public/templates/products-template.csv`](../public/templates/products-template.csv).
Open it in Excel or Google Sheets, fill it, save as CSV, upload.

---

## 1. The columns

23 of them. Only six are required; the rest have sensible defaults.

| Column | Required | What goes in it |
|---|---|---|
| `serial` | **yes** | `001`, `002`, … Any unique label. It is what links a row to its photographs. |
| `sku` | no | Leave blank and one is generated from the category and serial. |
| `title` | **yes** | English name, as it appears on the site. |
| `title_bn` | no | Bengali name. Blank is fine — the page falls back to English. |
| `category` | **yes** | `Chains`, `Rings`, `Earrings`, `Bracelets`, `Anklets`, `Toe Rings`, `Baby Sets`. Name or slug. A category that does not exist is created. |
| `short_desc` | no | One line, shown on the card. |
| `description` | no | Full text, shown on the product page. |
| `price_mode` | no | `fixed` (default) or `weight`. |
| `price_rupees` | **yes** | `1000`. Rupees, not paise — the importer converts. |
| `compare_at_rupees` | no | The struck-through price. Must be higher than `price_rupees`. |
| `weight_g` | no | `8.5`. Needed only for `weight` pricing; otherwise informational. |
| `purity` | no | `925` (default), `999`, `plated`, `gold-plated`, `oxidised`. |
| `hallmarked` | no | `yes` / `no`. Default `no`. |
| `huid` | no | The BIS number, if hallmarked. |
| `sizes` | no | See **Sizes and silver qualities** below. |
| `stock` | **yes** | Whole number. `0` means the piece shows as made to order. |
| `collections` | no | `New Arrivals,Under 999`. Comma-separated. Created if missing. |
| `homepage` | no | Any of `featured`, `trending`, `new`. Comma-separated. |
| `tags` | no | Search words, comma-separated. |
| `status` | no | `active` (live) or `draft` (default — invisible until published). |
| `meta_title` | no | SEO title. Falls back to `title`. |
| `meta_description` | no | SEO description. Falls back to `short_desc`. |
| `images` | no | Filenames, comma-separated. See **Photographs** below. |

A field with a comma inside it must be wrapped in double quotes —
`"silver chain,925 silver"`. Excel and Sheets do this for you when you save
as CSV.

---

## 2. Sizes and silver qualities

The `sizes` column does two different jobs, because underneath they are the same
thing: a variant with its own stock and its own price difference.

**Plain sizes** — one price, several sizes:

```
sizes = 8,10,12,14
```

Four sizes, all at the product price, stock split from the `stock` column.

**Different prices per option** — add `|` and the difference in rupees:

```
sizes = 925 Sterling|0,999 Fine|+400
```

That gives one product with two buttons: *925 Sterling* at ₹1,600 and *999 Fine*
at ₹2,000. This is how to offer the same design in two silver qualities without
creating two products — which is what you asked for, and it means one page, one
set of photographs, and one review thread.

A minus works too: `Small|-100`.

**Its own stock per option** — add a third part:

```
sizes = Small|0|5,Large|+200|1
```

Five small, one large. Without it, the `stock` column is divided evenly across
the options, which is the right guess when you are typing the sheet by hand and
the wrong one when you are re-importing an export. The export always writes this
third part, so a round trip never loses a count.

---

## 3. Photographs

The sheet cannot hold images, so they are matched by **filename**.

Name each photo `<serial>-<n>.<ext>`:

```
001-1.jpg     first photo of product 001  (this becomes the main image)
001-2.jpg     second
001-3.jpg
004-1.jpg
004-2.jpg
```

Put them all in one folder. Then either:

- **leave `images` blank** and the importer takes every file starting with that
  serial, in order; or
- **list them** in the `images` column to control the order.

Phone photographs are large — 4 MB each is normal. They are uploaded to
Cloudinary, squared, compressed and converted to WebP on the way in. Rahul never
crops anything. 300 products at 3 photos each is roughly 900 uploads; expect it
to take a while and to run it once.

An `images` cell may also hold a full `https://…` URL, if the photos are already
hosted somewhere.

---

## 4. Running it

> **Not built yet.** This is item #1 in [TASKS.md](TASKS.md) and the specification
> the importer will be built to. The columns above are final; write the sheet now
> and it will load when the importer lands.

Planned, in the admin under **Products → Import**:

1. Choose the CSV. Choose the image folder.
2. **Preview.** A table of what will happen: *42 new, 3 updated, 2 rejected*,
   with the reason against each rejected row. Nothing is written yet.
3. **Commit.** Products are created as `draft` unless the row says `active`.
4. A summary, and a CSV of any rows that failed so they can be fixed and
   re-uploaded on their own.

Matching on re-import is by `sku`, falling back to `serial`. So the loop is:
export → edit in Sheets → re-import → only the changed rows change.

---

## 5. Filling the sheet quickly

The client's own sheet has nine near-identical chain rows. That is the normal
case, and it is where a spreadsheet earns its keep:

- Type the first row fully. Select it, drag the fill handle down 300 rows.
- Change only what differs — usually `serial`, `title`, `price_rupees`, `stock`.
- `title_bn`: write the Bengali once, then use find-and-replace on the number.
- `description`: one sentence repeated across a category is fine. Google does not
  punish it on a shop this size, and it beats 300 blanks.
- `serial`: type `001` and `002`, select both, drag — Sheets continues the
  sequence and keeps the leading zeros.

Do the photographs first and name them as you go. The filenames are the slowest
part of this whole process, and they cannot be fixed by dragging.
