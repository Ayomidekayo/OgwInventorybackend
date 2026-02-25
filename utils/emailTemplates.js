export const emailTemplates = {

  // ===============================
  // 📦 ITEM ADDED
  // ===============================
  itemAdded: ({
    item,
    category,
    quantity,
    measuringUnit,
    addedBy,
  }) => `
  <div style="background:#f4f6f9;padding:30px 0;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

      <div style="background:#1e3a8a;color:#ffffff;padding:20px;text-align:center;">
        <h1 style="margin:0;font-size:22px;">OGW Store Management</h1>
      </div>

      <div style="padding:25px;color:#333;">
        <h2 style="color:#1e3a8a;margin-top:0;">📦 New Item Added</h2>
        <p>A new item has been successfully added to the inventory system.</p>

        <table width="100%" cellpadding="8" style="border-collapse:collapse;">
          <tr><td><strong>Item</strong></td><td>${item}</td></tr>
          <tr style="background:#f9fafb;"><td><strong>Category</strong></td><td>${category}</td></tr>
          <tr><td><strong>Quantity</strong></td><td>${quantity}</td></tr>
          <tr style="background:#f9fafb;"><td><strong>Unit</strong></td><td>${measuringUnit}</td></tr>
          <tr><td><strong>Added By</strong></td><td>${addedBy}</td></tr>
        </table>

        <div style="text-align:center;margin-top:25px;">
          <a href="#" style="background:#1e3a8a;color:#ffffff;padding:10px 20px;border-radius:5px;text-decoration:none;font-weight:bold;">
            View Inventory
          </a>
        </div>

        <p style="margin-top:30px;font-size:12px;color:#777;text-align:center;">
          This is an automated email from OGW Store Management System.
        </p>
      </div>
    </div>
  </div>
  `,

  // ===============================
  // 🔄 ITEM RETURNED
  // ===============================
  itemReturned: ({
    item,
    returnedBy,
    quantity,
    condition,
    remarks,
    processedBy,
    status
  }) => `
  <div style="background:#f4f6f9;padding:30px 0;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

      <div style="background:#047857;color:#ffffff;padding:20px;text-align:center;">
        <h1 style="margin:0;font-size:22px;">OGW Store Management</h1>
      </div>

      <div style="padding:25px;color:#333;">
        <h2 style="color:#047857;margin-top:0;">🔄 Item Return Confirmation</h2>

        <table width="100%" cellpadding="8" style="border-collapse:collapse;">
          <tr><td><strong>Item</strong></td><td>${item}</td></tr>
          <tr style="background:#f9fafb;"><td><strong>Returned By</strong></td><td>${returnedBy}</td></tr>
          <tr><td><strong>Quantity</strong></td><td>${quantity}</td></tr>
          <tr style="background:#f9fafb;"><td><strong>Condition</strong></td><td>${condition}</td></tr>
          <tr><td><strong>Remarks</strong></td><td>${remarks || "None"}</td></tr>
          <tr style="background:#f9fafb;"><td><strong>Processed By</strong></td><td>${processedBy}</td></tr>
          <tr><td><strong>Status</strong></td><td>${status}</td></tr>
        </table>

        <p style="margin-top:30px;font-size:12px;color:#777;text-align:center;">
          This is an automated email from OGW Store Management System.
        </p>
      </div>
    </div>
  </div>
  `,

  // ===============================
  // 🚚 ITEM RELEASED
  // ===============================
  itemReleased: ({ item, releasedTo, quantity, releasedBy }) => `
  <div style="background:#f4f6f9;padding:30px 0;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

      <div style="background:#7c3aed;color:#ffffff;padding:20px;text-align:center;">
        <h1 style="margin:0;font-size:22px;">OGW Store Management</h1>
      </div>

      <div style="padding:25px;color:#333;">
        <h2 style="color:#7c3aed;margin-top:0;">🚚 Item Released</h2>

        <table width="100%" cellpadding="8" style="border-collapse:collapse;">
          <tr><td><strong>Item</strong></td><td>${item}</td></tr>
          <tr style="background:#f9fafb;"><td><strong>Released To</strong></td><td>${releasedTo}</td></tr>
          <tr><td><strong>Quantity</strong></td><td>${quantity}</td></tr>
          <tr style="background:#f9fafb;"><td><strong>Released By</strong></td><td>${releasedBy}</td></tr>
        </table>

        <p style="margin-top:30px;font-size:12px;color:#777;text-align:center;">
          This is an automated email from OGW Store Management System.
        </p>
      </div>
    </div>
  </div>
  `,

  // ===============================
  // ⚠️ LOW STOCK ALERT
  // ===============================
  lowStockAlert: ({ item, category, quantity, threshold }) => `
  <div style="background:#fef2f2;padding:30px 0;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

      <div style="background:#dc2626;color:#ffffff;padding:20px;text-align:center;">
        <h1 style="margin:0;font-size:22px;">OGW Store Management</h1>
      </div>

      <div style="padding:25px;color:#333;">
        <h2 style="color:#dc2626;margin-top:0;">⚠️ Low Stock Alert</h2>
        <p><strong>${item}</strong> (${category}) is running low.</p>
        <p>Remaining Quantity: <strong>${quantity}</strong></p>
        <p>Threshold Level: <strong>${threshold}</strong></p>

        <p style="margin-top:20px;font-weight:bold;color:#dc2626;">
          Please restock as soon as possible.
        </p>
      </div>
    </div>
  </div>
  `,

  // ===============================
  // ✅ RESTOCK ALERT
  // ===============================
  restockAlert: ({ item, category, quantity, restocker }) => `
  <div style="background:#ecfdf5;padding:30px 0;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

      <div style="background:#059669;color:#ffffff;padding:20px;text-align:center;">
        <h1 style="margin:0;font-size:22px;">OGW Store Management</h1>
      </div>

      <div style="padding:25px;color:#333;">
        <h2 style="color:#059669;margin-top:0;">✅ Restock Confirmation</h2>
        <p><strong>${item}</strong> (${category}) has been successfully replenished.</p>
        <p>Restocked By: <strong>${restocker}</strong></p>
        <p>Current Stock: <strong>${quantity}</strong></p>

        <p style="margin-top:20px;color:#059669;font-weight:bold;">
          Inventory levels are now stable.
        </p>
      </div>
    </div>
  </div>
  `,


  // utils/emailTemplates.js
 welcomeEmail : ({ name, createdBy }) => {
  const createdText = createdBy
    ? `Your account was created by ${createdBy}.`
    : `Your account has been created successfully.`;

  return {
    subject: "🎉 Welcome to OGW Store Management",
    text: `Hi ${name}, ${createdText} You can now login and manage your inventory.`,
    html: `
    <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">

        <!-- Header -->
        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0;">OGW Store Management</h1>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
          <h2 style="color: #111827;">Welcome, ${name}! 👋</h2>

          <p style="color: #4b5563; line-height: 1.6;">
            ${createdText}
            You can now access your dashboard and start managing
            inventory, releases, returns, and reports.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://ogwinventorysystem.vercel.app/login"
              style="background: #2563eb;
                     color: #ffffff;
                     padding: 12px 24px;
                     text-decoration: none;
                     border-radius: 6px;
                     font-weight: bold;">
              Login to Dashboard
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            If you did not create this account, please ignore this email.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} OGW Store Management. All rights reserved.
        </div>

      </div>
    </div>
    `,
  };
},
};

