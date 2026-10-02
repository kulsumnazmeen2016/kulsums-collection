# Kulsums Collection: going live

Your website is two things working together:

- **GitHub Pages** shows the website to everyone (free).
- **Supabase** saves everything online: products, photos, videos, orders, and staff logins (free to start).

Because everything is saved in Supabase, refreshing the page, clearing the browser, or switching phones never loses your data.

Plan about 30 minutes. You need an email address and a computer.

---

## Part 1: Create the database (Supabase)

1. Go to **supabase.com** and select **Start your project**. Sign up (signing in with GitHub is easiest).
2. Select **New project**.
   - **Name:** `kulsums-collection`
   - **Database password:** select Generate, then save it somewhere safe.
   - **Region:** South Asia (Mumbai), or the one closest to your customers.
   - Select **Create new project** and wait about 2 minutes.
3. In the left menu, open **SQL Editor**, then **New query**.
4. Open `setup.sql` from this folder, copy everything, paste it in, and select **Run**.
   You should see "Success. No rows returned."
5. Create your admin login:
   - Left menu: **Authentication**, then **Users**, then **Add user**, then **Create new user**.
   - Enter your email and a strong password, tick **Auto Confirm User**, and select **Create user**.
6. Make that login an admin. In **SQL Editor**, open a new query, paste this with your email, and select **Run**:

   ```sql
   insert into public.staff (user_id, role, email)
   select id, 'admin', email from auth.users where email = 'you@example.com'
   on conflict (user_id) do update set role = excluded.role;
   ```

7. Let invited staff create their own logins: **Authentication**, then **Sign In / Providers**.
   - Keep **Allow new users to sign up** turned **on**. Only emails an admin has added under Staff accounts get any access. Anyone else who signs up can see nothing.
   - Under **Email**, turn **off** **Confirm email** and save. Staff can then log in straight after creating their account, without waiting for a confirmation email (see "Emails from Supabase" below).

## Part 2: Connect the website to the database

1. In Supabase, open **Project Settings** (the gear icon).
   - Under **Data API**, copy the **Project URL** (it looks like `https://abcdxyz.supabase.co`).
   - Under **API Keys**, copy the **Publishable key** (starts with `sb_publishable_`). If you only see an "anon public" key, use that instead.
2. Open `config.js` in Notepad (Windows) or TextEdit (Mac) and paste both values between the quotes:

   ```js
   window.KC_CONFIG = {
     supabaseUrl: "https://abcdxyz.supabase.co",
     supabaseKey: "sb_publishable_xxxxxxxx"
   };
   ```

3. Save the file.

These two values are meant to be public, so it is safe for them to be on GitHub. **Never** put the "secret" or "service_role" key anywhere in the website.

## Part 3: Put the website on GitHub Pages

1. Go to **github.com** and create a free account.
2. Select **+** (top right), then **New repository**.
   - **Name:** `kulsums-collection`
   - Choose **Public**, then select **Create repository**.
3. On the next page, select **uploading an existing file**.
4. Drag in **`index.html`** and your edited **`config.js`**, then select **Commit changes**.
5. Open the repository's **Settings**, then **Pages** (left menu).
   - **Source:** Deploy from a branch.
   - **Branch:** `main`, folder `/ (root)`. Select **Save**.
6. Wait 1 to 2 minutes and refresh. GitHub shows **"Your site is live at …"**, for example
   `https://yourname.github.io/kulsums-collection/`

That address is your store. Share it with customers.

## Part 4: Tell Supabase your website address

This makes "Forgot password" emails link back to your site.

1. In Supabase: **Authentication**, then **URL Configuration**.
2. **Site URL:** paste your GitHub Pages address.
3. Under **Redirect URLs**, add your address with `**` on the end, for example `https://yourname.github.io/kulsums-collection/**`, and save. This lets the password reset link open the "Set a new password" page.

## Part 5: First login and bringing over your existing products

1. Open your site, scroll to the bottom, and select **Staff login**. Log in with the email and password from Part 1.
2. The dashboard should say: "Connected. Everything is saved online and shared with all visitors."
3. **If you already added products in the earlier version:**
   - Open that version, go to **Settings**, then **Backup**, and select **Download backup**.
   - On the live site, go to **Settings**, then **Backup**, select **Restore from backup**, and choose that file.
   - Your photos and videos upload to Supabase. Wait for "Backup restored".
4. Fill in **Settings**: UPI ID, WhatsApp support number, shipping, and so on.
5. Import WhatsApp chats, then publish from **Review and publish**.

## Part 6: Add more admins and employees

You can have as many admins as you like. Any admin can do this from the website.

1. Log in, open **Settings**, and scroll to **Staff access**, then **Staff accounts**.
2. Enter the person's email, choose **Admin** or **Employee**, and select **Add person**.
3. Tell them to open the store, select **Staff login**, then **New staff member? Create your account**, and use that same email.
   If they already have a login, they get access straight away.

From the same list you can change someone between Admin and Employee, send them a password reset email, or remove their access. You can't remove yourself or the last admin, so the shop is never locked out.

**Example: 4 admins.** Add three emails as Admin. Together with your own account, the list will show "4 admins" once all three have created their accounts.

## Part 7 (optional): Use your own domain, like kulsumscollection.in

1. Buy the domain from GoDaddy, Hostinger, Namecheap, or similar.
2. In GitHub: **Settings**, then **Pages**, then **Custom domain**. Enter `www.kulsumscollection.in` and save.
3. In your domain provider's **DNS** settings, add:
   - A **CNAME** record: name `www`, value `yourname.github.io`
   - Four **A** records: name `@`, values `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
4. After it verifies (minutes to a few hours), tick **Enforce HTTPS** in GitHub Pages.
5. Update **Site URL** in Supabase (Part 4) to the new domain.

## Part 8: Social media and Google (SEO)

**Social handles**
1. In the staff area, open **Settings**, then **Social media and links**.
2. Enter your Instagram, Facebook, YouTube, and other handles (for example `@kulsumscollection`), or paste full links.
3. Under **Other links**, add anything else, like a size guide or your Google review link.

They appear as icons in the footer and on the Contact page, and tell Google which accounts are yours.

**Help Google find your products**
1. In **Settings**, then **Google and search (SEO)**, enter your **Website address** and a short **Shop description** (about 150 characters).
2. Select **Download sitemap.xml** and **Download robots.txt**.
3. Upload both to GitHub next to `index.html`. Make sure `kulsums-share.jpg` and `kulsums-logo.png` from this folder are there too. They are the picture shown when your website link is shared.
4. Go to **search.google.com/search-console**, select **Add property**, choose **URL prefix**, and enter your website address.
5. To verify, choose **HTML file**: download the small file Google gives you, upload it to GitHub next to `index.html`, then select **Verify**.
6. In Search Console, open **Sitemaps**, enter `sitemap.xml`, and select **Submit**.
7. Download a fresh sitemap and upload it again whenever you add a batch of new products.

Google usually takes a few days to a few weeks to start showing new pages.

**What the website already does for Google:**
- Every product and category has its own address, for example `yoursite/?p=…`.
- Each page has its own title and description.
- Products tell Google their price, stock, photos, and star rating.
- Cart, checkout, and staff pages are kept out of Google.

**Other things that help:**
- Create a free **Google Business Profile**.
- Put your website address in your Instagram bio and WhatsApp Business profile.
- A custom domain (Part 7) looks more trustworthy in search results.

## Part 9: Market prices and recommended markup

Open **Market prices** in the staff area.

**Automatic search (optional)**
1. Create a Claude API key at **platform.claude.com**, under API keys. Add some credit, and set a monthly spending limit under Billing.
2. Paste the key on the Market prices page and select **Save key**, then **Test the key**.
   - The key is saved only in that browser, never on the website. Each admin adds their own on their own device.
3. Select **Check** on a product, then **Search the market now**.
   - Claude searches Myntra, Ajio, Amazon, Flipkart, Meesho, and similar shops, using up to 5 web searches per product.
   - Only the product's title, details, and photo are sent. Your vendor price, vendors, and customers are never sent.

**Without a key**, use the ready-made search buttons (Google Shopping, Myntra, Meesho, Amazon, Flipkart, Ajio). Type in 3 to 6 prices you see, then select **Use these prices**.

**The recommendation** shows:
- the lowest, middle, and highest market price
- the recommended selling price and the markup on your cost
- your profit on the product

It asks **"Apply a 36% markup to this product?"** Choose **Yes** for this product, apply it to the **whole category**, or choose **No** to keep your current price.

**Your rules** are set under "How to set the price" on the same page:
- **Price position:** a little below the market (the default, 5% below the middle), matching the middle, or a little above for premium pieces.
- **Minimum markup:** 30% by default, the level online ethnic-wear resellers usually keep to cover shipping, fees, and returns.

**Which price wins:** a price you type by hand comes first, then the product's markup, then the category's markup, then the store markup. Only staff can see any of these; customers only ever see final prices.

## Part 10: AI assistants and integrations

ChatGPT, Claude, Perplexity, and Gemini answer "where can I buy…" questions by reading websites. Most of them cannot run this shop's app, so the site makes plain files they can read.

1. In the staff area, open **Settings**, then **AI assistants and integrations**. Choose whether AI search assistants may read the shop (recommended), and separately whether AI companies may train on it.
2. Select **Download all files (ZIP)**, unzip it, and upload every file to GitHub next to `index.html`:
   - `llms.txt`
   - `catalog.html`
   - `products.json`
   - `products.xml`
   - `sitemap.xml`
   - `robots.txt`
3. Tick **I have uploaded these files**. This adds an "All products" link in the footer.
4. Download and upload the files again whenever you add a batch of new products.

**Optional integrations with the same files:**
- **Google Merchant Center** (free listings in Google Shopping): add a feed and use the address of `products.xml`.
- **Meta Commerce Manager** (Instagram and Facebook shop): add a data feed with the same `products.xml` address.
- **Pinterest catalogues:** the same `products.xml` address works.
- **Your own apps or partners:** they can read `products.json`.

## Part 11: Bills on WhatsApp and email

**Every order has a Bill button** on the Orders page. It shows the full bill and offers these options:
- **To customer on WhatsApp:** opens WhatsApp with the whole bill written out. You just press send.
- **To admin:** one button for each admin WhatsApp number you add in Settings.
- **Email to admin:** sends the bill for your records.
- **Download PDF:** a bill with your logo, address, and GSTIN.
- **Share PDF:** on a phone, sends the PDF file itself into WhatsApp.

Each send is recorded on the order. Customers can also download their own bill from their order page.

**Set up the bill details:** in **Settings**, then **Bills and records**, fill in:
- your business address and GSTIN (optional)
- admin WhatsApp numbers (with country code, separated by commas)
- admin email addresses

**Automatic emails (optional, free).** A website on GitHub cannot send email by itself, so this uses EmailJS. It is free for 200 emails a month. Without it, "Email to admin" opens your email app with the bill filled in.

1. Sign up at **emailjs.com**.
2. **Email Services**, then **Add New Service**, then **Gmail**. Connect your Gmail, then copy the **Service ID**.
3. **Email Templates**, then **Create New Template**:
   - **To Email:** type your own email address directly. Do not use a variable, so no one can use your account to email anyone else.
   - **Subject:** `{{subject}}`
   - **Content:** `{{{message_html}}}` (three curly brackets show the formatted bill), or `{{message}}` for plain text.
   - Save, then copy the **Template ID**.
4. **Account**, then copy the **Public Key**.
5. Paste all three into **Settings**, then **Bills and records**, and select **Send a test email**.
6. Choose which automatic emails you want:
   - **Email admin a copy of every new order**
   - **Email the final bill when an order is confirmed or delivered**

## Part 12: Colour variations and Quick fix

**One product, many colours.** When a vendor sends the same design in several colours, the import groups them into one product with colour choices.
- It recognises both styles vendors use: several photos with one description, and separate messages such as "Same in navy 540".
- It reads each colour's price from the description: "Maroon 520, Navy 560", "1st pic 1450, 2nd pic 1600", or a bare "540".
- Each colour gets a colour name box and a price box you can correct before saving. If colours cost different amounts, the card shows "From ₹…" and the price changes when the customer picks a colour.
- If the import groups two products by mistake, select **Split colours into separate products**. To group two rows yourself, select **Add to the product above as more colours**.
- Messages with their own design code, or that say "new design", are kept as separate products.

**Combine existing products.** On the Products or Quick fix page, select two or more products and choose **Group as colours of one product**.

**Quick fix page** (in the staff menu):
- **Filters:** No price, No description, No vendor, No photo, and Check category, each with a count.
- **Inline editing:** change title, vendor, vendor price, category, description, and each colour's name and price right in the list. Changes save as you type, and the product turns green when it is complete.
- **Bulk actions:** select several products, then set the vendor, price, or category for all of them, or publish them together.

## Part 13: Combo offers and genuine MRP

**Combo offers** (staff menu: Combo offers) mix and match products from the same price range.

1. The page groups your live products into price ranges, for example "Up to ₹799" or "₹2,000 to ₹2,499".
2. For each range it suggests combos such as **Any 2 for ₹…**, **Any 3 for ₹…**, or **Buy 2 get 1 free**. Each suggestion shows:
   - what the customer saves
   - **your profit per order** compared with a single-piece order
   - the **lowest profit on any mix**, assuming the costliest piece every time
3. Suggestions never go below your minimum markup rules, and never earn less than one normal sale.
4. Select **Create this offer** to make it live. You can edit the price, the number of pieces, the price range, the categories, the dates, and whether it shows on the home page.

**What customers see**
- a badge on eligible products and an offer box on the product page
- a Combos page and a home page section
- the saving applied in the cart automatically, with a nudge such as "Add 1 more piece from ₹800 to ₹999 to get Any 2 for ₹1,499"
- the combo on the order and the bill

**Combo and coupon together:** by default the customer gets whichever saves more, the combo or the coupon. You can allow both under "Let customers add a coupon on top of a combo".

**Genuine MRP**
- When the vendor's description includes an MRP (for example "MRP 1,899"), it is saved with the product.
- Customers see it crossed out with the real % off, but only when your price is lower.
- You can edit MRP in More edits or on Quick fix. Only enter an MRP the vendor actually gave.
- Quick fix flags any product priced **above MRP**, because selling above MRP is not allowed.

**Keep offers honest.** India's consumer rules (Consumer Protection Act 2019 and the CCPA's 2023 dark-patterns guidelines) treat these as misleading, and they can lead to complaints and penalties:
- made-up "was" prices
- countdown timers that reset
- fake "only 2 left" messages
- fees that appear only at the last step

The site avoids all of these. Give offers real end dates, and the cash-on-delivery fee is shown from the product page onwards.

## Part 14: Adding products by hand, and managing orders

**Add a product by hand** (staff menu: Add a product), for products that did not come from a WhatsApp chat.
- **Photos:** each photo can be a colour with its own vendor price. Colours are detected for you.
- **Details:** title, vendor (or "+ New vendor"), vendor price, MRP, selling price (leave it empty to use your markup), category, description, and stock.
- **Category:** suggested from the title as you type.
- **Publishing:** admins can publish straight away. Employees' products wait on Review and publish.
- Products added this way are marked **Added by hand**. The Products page has an "Added by hand" filter.

**Spreadsheet of products added by hand:** on the Products page or the Add a product page, select **Spreadsheet of products added by hand**. You can choose a date range, or leave it empty for everything. The Excel file includes:
- photo, code, title, category, and vendor
- vendor price, selling price, and MRP
- each colour's cost and selling price
- stock, status, date added, who added it, and the description
- totals, with filters on every column

**Managing orders** (Orders page):
- **Find an order:** type in the search box and order numbers are suggested with the customer's name and total. You can also use **Jump to order**.
- **Add an order:** for orders taken on WhatsApp, the phone, or in person.
- **Edit:** change customer details, items (add, remove, change colour, quantity, or price), combo saving, discount, coupon, shipping, cash on delivery fee, payment, status, tracking, and a staff-only note. The total updates as you type.
- **Delete:** admins only, and it cannot be undone. Download the bill first if you need a record.
- **Activity log:** every order shows its status changes, bills sent, and edits. **Clear log** empties it but keeps the current status.

**Run the updated setup.sql once** (SQL Editor, then New query, paste it, then Run). This lets customers see staff edits, such as changed items or totals, on their order page. It keeps all your data.

## Part 15: Duplicates and bulk video tools

**Duplicate posts are kept out of the store automatically.** Open **Duplicates** in the staff menu.

- **Stop duplicates from being published.** Whenever anyone publishes a product (Review and publish, Quick fix, Products, More edits, Add a product), it is compared with every live product. If a photo matches, or the same vendor sent the same description, it is held back.
  - **Admins** see the new product next to the original and can choose **Keep duplicates out**, **Publish ticked only**, or **Approve all and publish**. Your approval is saved on the product, so it is never flagged again.
  - **Employees** cannot publish a duplicate. It is sent to **Duplicates, then Waiting for your approval**, with their name on it.
- **Remove duplicates already in the store.** Each time an admin opens the staff area, the store is checked. The oldest post stays live and newer copies are taken down (hidden, not deleted). Use **Check the store now** to run it any time.
- **How closely photos must match:** Normal is recommended. Choose Strict if different colours of the same design are being caught, or Relaxed to also catch re-cropped photos.
- On **Review and publish**, a red note appears on any product that looks like a duplicate before you publish it.
- On the Duplicates page, select items (or **Select all**) to **Approve and publish** or **Delete** them together. Deleting a duplicate never touches the original.

**Videos: select all and delete.** On the **Videos** page:
- Filter by **All, Live, Hidden, Waiting for review,** or **Possible duplicates** (same file size and length).
- Tick videos, or use **Select all**, then **Publish**, **Hide from store**, or **Delete**. Deleting also frees the storage space in Supabase.
- **Select duplicates** ticks every repeated copy, keeping the oldest one.
- On Review and publish there is also **Delete all** for waiting videos.

**Recently viewed.** Shoppers see "Pick up where you left off" on the home page and "You looked at these" on product pages. It is stored only on their own phone. Turn it off in **Settings, then Store features**.

No database changes are needed for this update. Upload the new `index.html` only.

## Part 16: Keeping the site fast

This version already loads faster: the Excel, ZIP, PDF and QR tools (about 1.4 MB) now load only when staff or a checkout needs them, so shoppers never download them.

Other things that make the biggest difference:
- **Keep videos short and small.** Aim for under 10 MB and 30 to 60 seconds. Compress them first with a free app such as HandBrake or an online video compressor. This also saves your Supabase data allowance.
- **Photos are already shrunk** when you add them (1100 px wide, and 360 px thumbnails), so there is no need to resize them first.
- **Choose the Mumbai region** in Supabase so data travels a short distance to Indian customers.
- **Upgrade Supabase to Pro** once you have regular orders. Free projects pause after a week without visitors, and the first visit after a pause is very slow.
- **Optional: put Cloudflare (free) in front of your domain.** Move your domain's nameservers to Cloudflare and add the same GitHub records there. Cloudflare caches the site in Indian data centres and compresses it.
- **Check your speed** at pagespeed.web.dev. Test the mobile score, because most customers shop on phones.

## Part 17: Orders on WhatsApp, stock check, your product IDs

**New order alerts.** Keep the staff area open (a phone or computer is fine). Within a minute of a customer ordering, a box appears with a sound: **New order**, with **Send to my WhatsApp**.
- The message has every item with your ID, the store code, the vendor's name and phone, the vendor price, the vendor's full description, and a photo link.
- Tick **Attach product photos** to send the photos themselves (see Part 19).
- Select **Also alert me when this tab is in the background** once, to get a notification even when you are in another app or tab.
- Add your number under **Settings, then Bills and records, then Admin WhatsApp numbers**. If it is missing, the site asks for it the first time.
- New orders show a **New** label and a gold **Send to my WhatsApp** button until they have been sent.

**Stock check (made automatically for every order).** Each order has a **Stock check** list:
- Mark each piece **Available** or **Not available**. **Ask vendor** opens WhatsApp to that vendor with the photo and their own description.
- **Tell customer about stock** writes the right message: everything available, some pieces not available (listed separately), or nothing available.
- **Confirm order** confirms it once every piece is checked.

**When an order is confirmed** (from the stock check, the status box, or Edit), a window offers two messages:
1. **Delivery address to your WhatsApp**: From Kulsums Collection, then Name, Mobile, Address, City, State, Pincode, payment, and the items.
2. **Let the customer know**: a warm confirmation with their items, total and address.
**Address to my WhatsApp** on the order sends the address again at any time.

**Warm messages to customers.** **Message customer** on each order opens ready-made messages for every step: order received, stock, confirmed, payment received, packed, shipped (with tracking), delivered, and cancelled. **Write my own** is for anything else. You can change any message before sending. When you mark an order packed, shipped, delivered, cancelled or paid, the right message opens by itself (turn this off in Settings).
Change the usual wording in **Settings, then WhatsApp messages to customers**. Every message sent is recorded in the order's activity log.

A website cannot send WhatsApp messages without someone tapping Send. Fully automatic messages need the paid WhatsApp Business API and a small server. Ask if you want this later.

**Your product IDs.** Give each product your own short ID, such as K104.
- Type it on the review card, in **More edits**, or on **Add a product**, or use **Settings, then Your product IDs, then Give an ID to all products without one**.
- Type an ID in **Find by my ID** at the top of the staff menu (shortcut: press /). It opens the vendor, their phone, their full description with a Copy button, the photos, and the prices.
- IDs appear on orders, in the stock check, and in your WhatsApp messages. You can search orders and products by ID, and add an item to an order by typing its ID.
- Customers never see your IDs.

**Better titles and descriptions.**
- Descriptions now keep the vendor's own words: their opening lines first, then their details exactly as they gave them (Top, Bottom, Dupatta, Size and so on). Prices, phone numbers, codes, emojis and "book fast" lines are still removed.
- Titles now include the vendor's design name (for example Gulnaar), the style (naira cut, floral, angrakha…) and the colour when there is only one.
- To rebuild existing titles, open **Products** and select **Tidy titles from descriptions**. Titles you typed yourself are kept.
- **Write with AI** (review cards, More edits, and **Write all with AI** on Review and publish) asks Claude to write the title and description while keeping the vendor's essence. It uses the Claude key saved on the Market prices page.

No database changes are needed. Upload the new `index.html` only.

## Part 18: Resellers and vendors

Open **Resellers and vendors** in the staff menu. You can add or change people here any time.

**Resellers** (people who sell your products to their own customers)
1. Select **Add a reseller**. Enter their name and WhatsApp number. A code such as **R01** is given automatically, or type your own.
2. Select **Copy store link** and send it to the reseller. Any order placed through their link is tagged with their code for 30 days.
3. Optional: turn on **Show a “Reseller code” box at checkout** for customers who come without the link.
4. On any order you can choose or change the reseller from the **Reseller** box, or in **Edit**.

Each reseller's card shows their number of orders, total sales and last order. **Orders** shows only their orders. The Orders page also has an **All resellers** filter, including **Direct orders only**.

**Vendors**
- Vendors from imported chats appear here automatically. Select **Add a vendor** to add one by hand.
- Enter their **WhatsApp number**. Turn on **Ships directly to my customers** if the vendor posts the parcel to your customer. Their messages will then include the delivery address and your shop name as the sender.

**Sending an order**
- Every order has a **Send order to** row with one button for the reseller and one for each vendor in the order.
- **Resellers** get the customer, the delivery address, items with photos, total, payment and tracking. Once the order moves on, choose **Status update** for a short progress message.
- **Each vendor gets only their own items**, with their own opening lines, colour, quantity, your price with them, and a photo.
- A ✓ shows who has already been sent the order.
- When you confirm an order, the confirmation window also has a button for the reseller and each vendor.

**Employees:** to let employees add and edit resellers, run the updated `setup.sql` once (SQL Editor, then New query, then paste it and select Run). It keeps all your data. Admins can use everything straight away.

## Part 19: WhatsApp Web, photos, Noor's voice, categories

**WhatsApp Web on your laptop.** Every WhatsApp button now opens **WhatsApp Web** on a computer (it works with WhatsApp Business) and the WhatsApp app on a phone.
- To force one or the other on a particular device, go to **Settings, then WhatsApp messages to customers, then This device opens**.
- Keep WhatsApp Web signed in. If it says it is open in another window, click **Use here**.

**Attach product photos (tick box).** Every WhatsApp window (to you, customers, resellers and vendors, and Ask vendor) has an **Attach product photos** tick box with small previews. It is ticked by default for you, resellers and vendors.
- **On a computer:** press Send. WhatsApp Web opens with the message typed, and the photos are saved to your Downloads. Drag them into the chat, or click **+**, then **Photos & videos**. The first time, Chrome may ask to allow several downloads: choose Allow.
- **On a phone:** press Send, choose **WhatsApp Business**, then the chat. The photos and text go together.
- When photos are attached, the photo links are taken out of the text.

**Noor's voice.** Noor says the welcome once per visit ("Assalamu alaikum! Hello, and welcome to Kulsums Collection.") and thanks shoppers after they order. Browsers only allow sound after a shopper's first tap, so the welcome plays then.
- In **Settings, then Shopping guide, then Noor's voice**, you can change the words and press **Play** to hear them.
- **Record my voice** records your own voice with the computer or phone microphone, up to a minute. **Upload audio** uses an MP3 or M4A file. Your recording then plays instead of the computer voice.
- Shoppers can turn her voice off from Noor's menu.

**Categories.** Sarees no longer go into Jewellery, or the other way round.
- The item word decides the category. "Jhumka border saree" and "necklace print saree" are sarees. "Kundan necklace set, perfect with any saree" is jewellery.
- Words like baby pink, chanderi, bridal and "for college girls" no longer push items into the wrong place.
- The first time an admin opens the staff area after this update, every product the computer placed is checked again and moved if needed. Products you placed by hand are not moved; if one looks wrong (a saree under Jewellery), it shows **Check category** under Quick fix.
- **Write with AI** now also picks the category.

No database changes are needed for this update. Upload the new `index.html` only.

## Part 20: Reports and vendor payments

Open **Reports** in the staff menu, or select **Sales report** on the Dashboard. Admins only.

**Choose the view.** Use **Day**, **Month** or **Year**, then the date box or the ‹ › arrows to move between periods. **Today** jumps back to now.

**Sales** (overall)
- Sales, orders, pieces sold, average order, vendor cost, your margin, money received and money still to collect. Cancelled orders are not counted.
- A bar chart by time of day (Day view), by day (Month view) or by month (Year view).
- Best sellers and a list of every order.
- **Sales of** shows one reseller only, or direct orders only.

**Resellers**
- Sales by each reseller for the period: orders, pieces, sales, margin, received and to collect, plus their share of all sales.
- **Send statement** opens a WhatsApp message to the reseller with their totals and order list. **Details** opens their orders.

**Vendor payments**
- Per vendor: what you owe for the period's orders, what you paid in the period, and the balance still to pay over all time (red means you still owe money). "Owed" is the vendor price of every piece in confirmed, packed, shipped and delivered orders.
- **Record a payment**: add payment screenshots (choose them, drag them in, or copy a screenshot and press Ctrl+V). Then enter the vendor, amount, date, how you paid, and the UTR or reference.
- **Fill in from the screenshot (AI)** reads the amount, date, UTR and who was paid from the screenshot. It uses the Claude key saved on the Market prices page. Always check the details before saving.
- Select a screenshot to see it large, or **Edit** to change or delete a payment.
- The **Payments** button on each vendor under Resellers and vendors opens that vendor's payments.

**Download.** **Download Excel** saves the report for the chosen period, with tabs for Summary, Orders, Resellers and Vendor payments. **Print or save PDF** prints the page; choose "Save as PDF" in the print window.

Payment screenshots are stored in your Supabase storage under a random file name. Vendor payments are included in backups.

## Part 21: Combined version

This version combines the changes in your uploaded `index (1).html` with every earlier update:
- Pages of 100 on Products, the Vendor price list and the store.
- **Select** on store pages for admins, to remove products or move them to a category together.
- Add to store and Remove from store in bulk.
- The **Accessory** tick box for categories.
- Noor reading her tips aloud, with a Voice on/off choice.

Noor now says **"Assalamu alaikum"** slowly and softly on its own, then the rest of the welcome. She uses the most natural woman's voice on the device; Microsoft Edge on Windows has especially good Indian English voices. For the sweetest sound, record the welcome in your own voice (Settings, Shopping guide, Noor's voice, Record my voice).

## Part 22: Phones, tablets and laptops

**Noor on phones.** A small round Noor (just her face) sits in the corner, so she no longer covers products.
- She does not pop up by herself on phones. When she has a tip, a small red dot appears on her; the shopper taps her to read it.
- Adding to the bag or wishlist makes her do a happy little jump instead of opening a message.
- She does not check in when a shopper seems stuck, and she does not offer the tour by herself.
- The first time a shopper taps anything, she says the welcome once.

**Tablets.** Noor is a little smaller and her messages close sooner. **Laptops** work as before.

**Staff area on phones and tablets.** The menu is folded behind a **Menu** button at the top, which also shows the page you are on, so pages open straight to their content. Tables scroll sideways inside their box, and order cards, reports and settings fit the screen. Every page was checked at phone (375px), tablet (768px and 1024px) and laptop (1440px) widths with nothing spilling off the side.

**Noor's voice.**
- She now chooses an **Indian English** voice first, then a Hindi voice (which has an Indian accent), then others. Men's voices are never chosen.
- Her pitch is now natural (1.05) at a relaxed speed, and "Assalamu alaikum" is said a little slower on its own.
- In **Settings, then Shopping guide, then Noor's voice**:
  - **Voice**: pick a voice on your device, or leave "Automatic" to get the best Indian voice on each shopper's device.
  - **Pitch** and **Speed**: sliders, with **Hear a sample** to try them. **Reset to natural** puts them back.
- Her messages are warmer and vary a little each time, for example "Lovely choice! It is in your bag." or "Just ₹200 more, and your shipping is free!"
- The best Indian voices: Microsoft Edge on Windows (Neerja, Natural), Chrome on Android (Google English India), and iPhone (Veena).
- For the most personal sound, record the welcome in your own voice (**Record my voice**).

## Part 23: Noor on phones: voice and sharpness

**Voice on laptops, quiet on phones.** In **Settings, then Shopping guide, then Noor's voice**, there are now two switches:
- **Speak on laptops, computers and tablets**: on.
- **Speak on phones**: off. On phones she stays quiet and shows her messages only when tapped.
You can turn either on or off any time. **Speaks at all** turns her voice off everywhere. On devices where her voice is off, the Voice on/off choice is hidden from shoppers.

**Steadier voice on phones** (if you switch it on):
- She speaks straight from the shopper's tap, because iPhones ignore speech that starts a moment later.
- On phones the greeting and welcome are said as one sentence. Phones often dropped or cut off the second part.
- She no longer stops and restarts speech unless something is already playing, which made Android swallow words.
- The spoken sentence is kept in memory until it finishes, because some phones went quiet halfway through.

**Sharper Noor on phones.**
- The small round Noor no longer uses the blurred shadow effect, which phones draw at low resolution. She now has a crisp round frame, and her whole head (with her hair buns) shows.
- Uploaded avatar pictures are now kept at up to 900px instead of 480px. If you uploaded your own picture before, upload it again for a sharper result.

## Part 24: Tasks, approval queue, full view, chat archive

**Run the updated `setup.sql` once** (SQL Editor, then New query, then paste it and select Run) so employees can save tasks and the chat archive. Your data is kept.

### Tasks (like Jira)
Open **Tasks** in the staff menu.
- **Board:** To do, In progress, Waiting approval, Done. Drag cards between columns on a laptop, or use the box on each card on a phone.
- **Queues:** **Today**, **This week**, **Other tasks** (one-off jobs you add) and **Everything**. Filter by person.
- **Daily and weekly jobs are made automatically** each day from your workflow. Estimates grow with what is waiting; for example, "Edit new products" adds 3 minutes for each product to edit. Yesterday's unfinished copy of a daily job is marked Skipped, so jobs do not pile up.
- **Timer:** ▶ starts timing a task and ⏸ pauses it. Time spent shows on the card and in "Time spent today".
- **Open** on a task goes straight to the right page and queue (for example, new orders or products ready for approval).
- **Workflow and team:** add your people (name, role, hours a day), edit or switch off each repeating job (days, minutes, minutes per item, who does it), and add your own jobs. **Restore the suggested workflow** puts the starting set back.
- **Workforce you need:** time a day for each role, how many people that means, and whether it needs a full-time or part-time person or can be shared. The total also shows hours per week. **Your team's load today** shows each person's work against their hours.

### Approval queue
**Review and publish** now has two queues: **To edit** and **Ready for approval**.
- Anyone can edit a product and select **Send for approval**. Employees can no longer publish directly.
- Admins open **Ready for approval** and select **Approve and publish**, or **Send back** with a note. The note is shown on the product until it is fixed.
- **Approve and publish all** publishes the whole ready queue at once. The duplicate check still runs.

### Full view of a product
Select **Full view** on any review card, or tap a product in the chat archive.
- **Left:** every photo, large, with the vendor's original message, their price and the chat date. **Show in the chat** opens the exact message it came from.
- **Middle:** everything you can change: title, your ID, category, selling price, stock, description, home banner, and a note for the approver.
- **Right:** the product exactly as customers will see it, updating as you type.
- The ‹ › buttons (or the arrow keys) move through the queue. After you approve or send one, the next opens by itself.
- On phones the three parts are tabs: Photos and source, Edit, and Customer view.

### Chat archive
Every chat you import from now on is kept in **Chat archive**, laid out like WhatsApp: bubbles, dates, photos, and your replies on the right in green.
- **Pages:** each chat is split into pages of 80 messages. Use First, ‹ Older, Newer ›, Latest, or jump to any page. It opens at the latest messages.
- **Search this chat:** matches are highlighted, with ▲ ▼ to move between them. **Search every chat** is on the archive page; select a result to jump to that message.
- **Photos:** a photo that became a product shows its title and whether it is live; tap it to open the product. Other photos are kept as small copies. Tap any photo to see it large.
- **Download as web page:** saves the chat as a single web page you can open in any browser, with pages and search.
- **Delete (admins):** remove a single message (hover over it and select ×), or a whole chat. Deleting a chat never deletes the products made from it.
Chats imported before this update were not kept, so import them again if you want them in the archive.

## Part 25: Instagram, colours, search by photo

### Post on Instagram
Every product on **Review and publish**, and in **Full view**, has an **Instagram** button. It opens a window where you:
- tick the photos to post (up to 10 become one carousel post);
- check the caption, which is written for you with the title, description, price, store link, WhatsApp number and hashtags. You can change it.

Every photo is fitted to Instagram's 4:5 shape without cropping. The button shows **Instagram ✓** once a product has been posted.

**Without connecting Instagram** (works straight away):
- **Laptop:** **Download photos and copy caption** saves the photos and opens Instagram. Select Create (+), add the photos and paste the caption.
- **Phone:** **Share to the Instagram app** opens the share sheet. Choose Instagram, then paste the caption.

**To post with one tap (Post now)**, connect your account once:
1. In the Instagram app, switch to a **Professional account** (Business or Creator): Settings, then Account type and tools.
2. Go to developers.facebook.com, sign in with Facebook and select **Create app**, then choose the **Instagram** use case.
3. In the app, open **Instagram, then API setup with Instagram login**. Select **Add account** and sign in to your shop's Instagram.
4. Select **Generate token**. Copy the **access token** and the **Instagram account ID** shown next to your account.
5. In your staff area, go to **Settings, then Instagram**, paste both, and select **Test the connection**. It should say "Connected to @yourshop".

Tokens last 60 days. Generate a new one in the same place when the test stops working. Posting directly needs the online (Supabase) version of the store, because Instagram has to fetch the photos from the internet.

### Colours: Color 1, Color 2
- When a product has photos in different colours, they are now called **Color 1**, **Color 2** and so on.
- The coloured dots and the computer's guessed colour names (which were often wrong) are gone from the store, and colours are no longer added to automatic titles.
- To use real names, type them in the **Colours** boxes on the review card (for example "Bottle green"). Names you type are always kept.
- The first time an admin opens the staff area after this update, existing products are changed over. Titles you typed yourself are not touched.
- Searching for "maroon" in Products still finds products whose photo looked maroon.

### Search the chat archive by photo
- At the top of **Chat archive**, choose a photo, drag one in, or copy a photo and press Ctrl+V. Every photo kept in your chats is compared with it.
- Matches are labelled **Same photo**, **Very similar** or **Similar**. Select one to jump to that message.
- When viewing a photo large inside a chat, **Find similar photos in chats** searches with that photo.
- Cropped or resized copies of a photo are still found. Photos are compared by their look, not by their file.

## Part 26: Products from the order window, and vendor settlement

### Add or edit products while creating an order
In **Orders, then Add an order** (or **Edit** on any order):
- Every item shows its photo, your ID, its code and its vendor, with **Edit product and photos**. That opens the product on top of the order, so nothing in the order is lost. You can change the title, vendor, vendor price, selling price, category, your ID, stock and description, and add, remove or reorder photos (★ makes a photo the main one). The order's item title updates too.
- **+ New product with photos** is for something not in the store yet:
  - Add its photos by choosing them, dragging them in, or pasting with Ctrl+V.
  - Enter a title, vendor (or **+ New vendor…**), vendor price and selling price.
  - Choose where it goes: **Only for orders** (not shown in the store), **Send to Review and publish**, or **Publish in the store now** (admins).
  - It is added to the order straight away.
- You can still add products with the dropdown or by typing your ID. Products kept "only for orders" appear in the dropdown too.

### Vendor settlement (Reports)
Open **Reports, then Vendor settlement**. It matches what each vendor sold through you with what you paid them, and checks your payment screenshots.

For each vendor, for the day, month or year you choose:
- **Sales** of their items, what you **owe** (vendor price × pieces), what you **paid**, how much of that is **verified**, and the **balance** over all time.
- The status is Settled, Owes ₹…, Overpaid ₹…, or **Check payments** (a screenshot does not match).

Select a vendor to see:
- **Orders:** each order with its items, sale, amount owed, amount paid, and Paid, Part paid or Not paid. Payments pay off the oldest orders first.
- **Payments:** screenshots, check status, notes on anything that does not match, and which orders each payment covers.

Checking payments against screenshots:
- **Add payments from screenshots** takes several screenshots at once. With your Claude key (Market prices page), each one is read for the amount, date, reference, and who was paid, and matched to a vendor. Check them, then select **Save payments**.
- **Check with AI** compares a payment's screenshot with what is recorded. It flags:
  - a different amount;
  - a date more than 2 days apart;
  - money paid to someone else;
  - a different reference;
  - a payment that may have failed.
- **Check … screenshots with AI** checks every unchecked payment in the period at once.
- **Mark as checked** records that you checked it yourself, without AI.
- A payment recorded with **Fill in from the screenshot (AI)** is checked automatically when saved.
- Add each vendor's **UPI ID** in their details (Resellers and vendors, then Edit). Screenshots showing a UPI ID are then matched to the right vendor.
- **Send statement** sends the vendor their orders, payments and balance for the period on WhatsApp.
- **Download Excel** now includes **Vendor settlement** and **Payment checks** sheets.

Status labels: ✓ Verified by screenshot · ✓ Checked by you · ! Does not match · • Not checked yet · — No screenshot.

## Part 27: Characters, team motivation, sales tips, Facebook, Marketing

**Upload four files this time:** `index.html`, plus `noor-3d.webp`, `zayan-3d.webp` and `promoters.webp`, all in the same place as `index.html` (the top of your GitHub repository). If a picture file is missing, Noor falls back to her drawn look.

### Your 3D characters
- **Noor** (the girl) is now the 3D shopping guide on your store. On phones she shows as a small round face.
- **Zayan** (the boy) is your team's helper. He brings the daily motivation in the staff area.
- **About us** now has a **Meet our promoters** section with both of them.
- To change them, go to **Settings, then Characters**:
  - Noor: choose 3D or drawn, or upload your own in "Shopping guide" (her name is set there too).
  - Zayan: change his name, or upload a new picture.
  - About us: switch the promoters section on or off, change the heading and words ({noor} and {zayan} become their names), or upload your own picture.

### Motivation for the team
At the top of the **Dashboard** and **Tasks**, Zayan shows a dua or message for the day. It changes daily, using 10 built-in duas and messages (for example "Rabbi yassir wa la tu’assir: My Lord, make it easy, and do not make it hard").

Admins select **Change** to:
- **pin** a dua or message, with a picture if you like;
- add your own messages to the daily list;
- switch the built-in ones off.

### Sales trend and tips (Dashboard, admins)
- Sales for the last 7 and 30 days, with ▲ ▼ against the period before, and a chart of the last 8 weeks.
- Up to 7 tips made from your own sales, each with a link to act on it. For example: a drop on last week, your best seller, a category that is not selling, your busiest day, high cash on delivery, your average order and free shipping, repeat customers, resellers, and new arrivals each week.

### Vendor payments are now easy to find
- **Vendor payments** has its own place in the staff menu, near the top.
- The Dashboard has **Add vendor payment screenshots** and **Vendor payments** buttons.

The page shows what each vendor sold, what you owe, what you paid and the balance, by day, month or year. You add screenshots and they are checked (see Part 26). The weekly "Pay vendors" task opens it too.

### Post on Facebook (and Instagram) from the product pages
**Instagram** and **Facebook** buttons are now on every live product in **Products**, on review cards, in **Full view**, and in **Marketing, then Post products**. A ✓ shows a product was posted before.

Without connecting Facebook, the button saves the photos and copies the caption (or opens the share sheet on a phone). To post with one tap:
1. Make sure your Instagram or Facebook business page is managed by your Facebook account.
2. On developers.facebook.com, open your app (the same one as Instagram is fine), then **Tools, then Graph API Explorer**.
3. Choose your app, then **User or Page, then your page**. Add the permissions **pages_manage_posts**, **pages_read_engagement** and **pages_show_list**, and select **Generate Access Token**.
4. Open the **Access Token Debugger**, select **Extend access token**, and copy the long-lived page token.
5. Your page ID is on the page, under **About, then Page transparency** (or in the Explorer: `me?fields=id,name`).
6. In **Settings, then Facebook page**, paste both and select **Test the connection**.

### Marketing (staff menu)
- **Copy-paste templates:** 22 ready messages for WhatsApp broadcasts (new arrivals, weekend sale, back in stock, price drop, free shipping), festivals (Eid, Ramadan, Diwali, weddings, Independence Day), customer care replies (price, sizes, delivery time, sold out, thank you, win back), Instagram and status, and resellers.
  - Type your **offer** and **coupon code** at the top, and they are filled into every template, along with your store link and free-shipping amount.
  - **Copy**, or **WhatsApp** to choose a chat or broadcast list.
  - Admins can **add their own templates**.
- **Today’s reel captions:** three of your newest products each day, each with a hook, caption, link and hashtags. Also the text to put on screen and 5 shots to film. Tap **Instagram** or **Facebook** to post the product, then **I posted today’s reel** to tick off the task.
- **Post products:** your newest live products, with both posting buttons.
- **Tasks** now has a daily job, **Post today’s reel (captions are ready)**, which opens these captions.

## Part 28: Publish to Instagram (secure, Instagram Login, no Facebook Page)

### How it works
- Your website stays exactly as it is (one `index.html` on GitHub Pages, with Supabase).
- A small server function, a **Supabase Edge Function** called `instagram`, does all the Instagram work. The Instagram login (access token) is stored **encrypted** in a database table that no browser can read, not even staff. It is never sent to the website and never logged.
- It uses Meta's current **Instagram API with Instagram Login** ("Business Login for Instagram", graph.instagram.com, permissions `instagram_business_basic` and `instagram_business_content_publish`). **No Facebook Page is needed.**
- What Meta still requires: a **Meta app** with the Instagram product, created on developers.facebook.com. See "If Meta will not let you register" below.

The flow: **Settings, then Instagram integration, then Connect Instagram** → you log in to Instagram and allow publishing → you come back to Settings showing "Instagram: @kulsumscollection, Connected". Then on any product, **Instagram, then Publish to Instagram** → the photo is fitted to 4:5 and saved as a public JPEG → the server creates the Instagram media container, waits for it, and publishes it → the product shows **✓ Published to Instagram** with the date, media ID and **View on Instagram**.

### Files in this update
- `index.html` (changed): Instagram integration in Settings; Publish to Instagram, Retry and Publish again in the posting window; ✓ and ⚠ on product buttons; Zayan for shoppers. The old browser-stored token is removed automatically.
- `supabase/functions/instagram/index.ts` (new): the server function.
- `instagram-setup.sql` (new): the database tables. Also added to the end of `setup.sql`.
- `config.js` does not change. No secrets go into GitHub.

### Database (run `instagram-setup.sql` once in Supabase, SQL Editor, then Run)
- `instagram_connections`: the connected account and the encrypted token. No access for browsers at all.
- `instagram_oauth_states`: one-time login codes that protect the login from forged requests. Server only.
- `instagram_posts`: one row per product: status (publishing, published or failed), media ID, link, date, and a friendly error. Staff can read it; only the server writes it. One row per product, so a product cannot be posted twice by accident.
- `instagram_publish_log`: Instagram's technical error details, for troubleshooting. Server only (look at it in Table Editor).

Your products stay where they are (the `kc:products` store data). Nothing is renamed or removed.

### Step-by-step setup

**1. Meta app** (on developers.facebook.com, by you or someone you trust; see the last section)
1. **My Apps, then Create app**, and choose the use case for Instagram (managing messages and content on Instagram).
2. Open **Instagram, then API setup with Instagram login**.
3. In **"Generate access tokens"**, select **Add account** and log in as **@kulsumscollection** (it must be a Business or Creator account). This gives your account access while the app stays in development mode, which is enough for your own shop.
4. In **"Set up Instagram business login", then Business login settings**:
   - **OAuth redirect URIs:** add exactly `https://YOUR-PROJECT.supabase.co/functions/v1/instagram/callback`, using the same project address as in your `config.js`.
   - Copy the **Instagram App ID** and the **Instagram App Secret**.

**2. Database:** run `instagram-setup.sql` in the SQL Editor.

**3. Server function:** in Supabase, go to **Edge Functions, then Deploy a new function, then Via Editor**.
1. Name it exactly `instagram`.
2. Paste in everything from `supabase/functions/instagram/index.ts`, then select **Deploy**.
3. Open the function's **Details** (or Settings) and turn **OFF "Verify JWT"** (also called "Enforce JWT verification"). Instagram's return trip has no Supabase login; the function checks staff logins itself.

**4. Secrets:** in **Edge Functions, then Secrets**, add:

| Name | Value |
|---|---|
| `IG_APP_ID` | the Instagram App ID from step 1 |
| `IG_APP_SECRET` | the Instagram App Secret from step 1 |
| `IG_TOKEN_KEY` | a random key: open your browser's console (F12) on any page, paste `btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))`, press Enter, and copy the result without the quotes |
| `SITE_URL` | your website address, for example `https://kulsumscollection.in` (no slash at the end) |

Optional: `IG_API_VERSION`, default `v25.0`. `SUPABASE_URL` and the service key are added by Supabase automatically.

**5. Connect:** upload the new `index.html`, log in as admin, go to **Settings, then Instagram integration, then Connect Instagram**, log in to Instagram, and select **Allow**.

### Testing "Publish to Instagram"
1. **Settings:** it shows "Instagram: Not connected". Connect, and it shows "@kulsumscollection, Status: Connected".
2. **Products:** on a live product with a photo, select **Instagram**. Check the caption (it starts "✨ New Arrival at Kulsums Collection ✨" and can be edited), then select **Publish to Instagram**. Within a minute it shows ✓ Published, the date, the media ID and **View on Instagram**, and the product's button shows **Instagram ✓** on every device.
3. **Same product again:** the button says **Publish again** and asks before posting a second time.
4. **Product with no photo:** a clear message, and nothing is sent.
5. **Disconnect in Settings, then publish:** "Instagram account is not connected." Reconnect afterwards.
6. **Refresh, log out and back in, or use your phone:** the status stays, because it comes from the database.

### Messages you may see
- "Instagram account is not connected." Connect in Settings.
- "Instagram authorization expired. Please reconnect." The login renews itself automatically; this only appears if nobody used it for 60 days or it was removed in Instagram.
- "Product image cannot be accessed by Instagram." The photo is missing, or not in your store's storage.
- "Instagram rejected the media." The photo is not accepted (unusual, because photos are converted to 4:5 JPEG).
- "Instagram publishing is temporarily unavailable." Try again in a few minutes.
- "Instagram API permission is missing." Reconnect and allow publishing.
- "Instagram's daily publishing limit has been reached." Instagram allows 100 posts a day.
- After a failure, **Retry** tries again. The details are in `instagram_publish_log`.

### Good to know
- Only **admins** can connect, disconnect and publish. Employees can see the status.
- Up to 10 ticked photos become one carousel post. Instagram crops carousel photos to match the first one.
- Instagram accepts only JPEG photos, at most 8 MB each. The website prepares them for you and deletes its temporary copies after publishing.
- Reels, stories and shopping tags are not part of this.

### If Meta will not let you register as a developer
Instagram Login removes the need for a Facebook Page, but a Meta app is still required. There are two ways:
1. **Try registering again** with the fixes from earlier: a personal Facebook profile, a normal mobile number, an Incognito window, two-factor authentication turned on, then waiting a day.
2. **Ask someone you trust** (a family member or a web developer) who has a Meta developer account to create the app (step 1). They add **@kulsumscollection** in "Generate access tokens" and send you the App ID and App Secret, which you put in Supabase secrets (step 4). You still connect with **your own** Instagram login, and the access token is stored only in **your** Supabase. They never see your password or your token.

Until then, the **Download photos and copy caption** button keeps working.

## Part 29: Zayan for shoppers
- Zayan (the boy) now appears on the **home page** and the **Offers page**, in a speech bubble that cycles through your announcements and offers every 6 seconds. Shoppers can tap the dots, and the **See offers** or **See combos** button takes them there.
- What he says, in this order: your own **special announcements** (Settings, Characters, one per line), then active **offers** (with coupon codes), then **combo deals**. If there is little else, he also reads your announcement bar messages.
- Turn him on or off for shoppers in **Settings, then Characters**.
- The girl stays as the shopping guide in the corner. To call her **Zoya**, change her name in **Settings, then Shopping guide**. She keeps the 3D look.

## Part 30: Launch fixes
- **Noor is visible again for everyone.** Anyone who had hidden her with "Hide me" sees her again after this update. She also stays on top of everything. If she ever looks drawn instead of 3D, `noor-3d.webp` is missing next to `index.html` on GitHub.
- **Zayan shows offers only:** his special offers (Settings, then Characters), your active offers (Offers and ads, with coupon codes), and combo deals. When there are no offers, he is hidden. His bubble keeps clear of Noor on tablets and phones.
- **About us:** "Meet our promoters" is now at the top, above your About us text.
- **Checkout: "Referral name"** replaces "Reseller code". Customers type the name of whoever referred them (turn the box on in Settings, then Resellers and vendors). On the Orders page, the name is shown, and if it matches a reseller's name or code, the order is linked to that reseller automatically. Customers who came through a reseller's link do not see the box; the link already credits the reseller.
- **Checked for launch:** every shopper page (home, categories, product, cart, checkout, About us, Offers, Contact, tracking, wishlist, search, policies) and every staff page, at laptop, tablet and phone sizes, with nothing spilling off the screen.

## Updating the website later

Your data lives in Supabase, so replacing the website files never touches products or orders.
To update: open the repository on GitHub, select **Add file**, then **Upload files**, drop in the new `index.html`, and commit. The site updates in 1 to 2 minutes.

---

## Good to know

**Free plan limits (Supabase):**

| What | Free plan |
| --- | --- |
| Database | 500 MB (thousands of products) |
| Photo and video storage | 1 GB |
| Data sent to visitors | 5 GB per month |
| Largest single file | 50 MB |

- **Videos use the most.** A 10 MB video watched 500 times uses the whole 5 GB monthly allowance. Keep videos short.
- **Pausing:** free projects pause after a week with no visitors. Open the Supabase dashboard and select **Restore** if that happens.
- **Pro plan:** at USD 25 a month it removes pausing and raises the limits a lot. Switch once orders are regular.

**Payments:**
- Prices are worked out in the customer's browser. Before shipping, always check that the amount you received matches the order total. The Orders page shows both.
- Card payments need a payment gateway such as Razorpay, which needs extra server setup. UPI and cash on delivery work now.

**Security:**
- Customers' browsers only ever download the public catalog. Vendor prices, vendor names, unpublished products, and orders are private to staff.
- Customers can check an order only with its number and the phone number used at checkout.

**Emails from Supabase (password resets):**
- Supabase's built-in email service is meant for testing. It sends only a few emails per hour and may only deliver to people on your Supabase team.
- If a staff member doesn't receive a reset email, an admin can set a new password for them. Open the SQL Editor and run this, with their email and a new password:

  ```sql
  update auth.users set encrypted_password = extensions.crypt('NewPassword123', extensions.gen_salt('bf'))
  where email = 'person@example.com';
  ```

- For dependable emails, connect a free email service such as Brevo or Resend under **Project Settings**, then **Authentication**, then **SMTP Settings**. Each service has a short guide for Supabase.

**Backups:** Supabase keeps your data safe, but downloading a backup from **Settings** once a month is still a good habit.

## If something is not working

| What you see | What to do |
| --- | --- |
| Dashboard says "saved only in this browser" | `config.js` is missing or still has the placeholder values. Check Part 2 and upload it again. |
| "This account is not set up as staff" | An admin needs to add that email under Settings, then Staff accounts (Part 6). For the very first admin, use the SQL in Part 1, step 6. |
| Password reset link opens the store, not "Set a new password" | Upload the latest `index.html`, and check the Redirect URLs in Part 4. |
| Reset email never arrives | Check spam. Otherwise see "Emails from Supabase" above. |
| Staff accounts says "Run the updated setup.sql" | Run the newest `setup.sql` in the SQL Editor again. It keeps your data. |
| "Could not reach the online database" | The Supabase project may be paused. Open supabase.com and select **Restore project**. |
| Photos do not upload, or "row-level security" error | Run `setup.sql` again. It is safe to repeat. |
| Site shows the old version after updating | Wait 2 minutes, then refresh with Ctrl+Shift+R (Cmd+Shift+R on a Mac). |
