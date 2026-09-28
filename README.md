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
