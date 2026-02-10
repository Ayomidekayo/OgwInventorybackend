export const emailTemplates = {
  itemReturned : ({
  item,
  returnedBy,
  quantity,
  condition,
  remarks,
  processedBy,
  status
}) => `
  <div style="font‑family: Arial, sans‑serif; color: #333;">
    <h2>Item Return Confirmation</h2>
    <p>The following item has been successfully returned:</p>
    <ul>
      <li><strong>Item:</strong> ${item}</li>
      <li><strong>Returned By:</strong> ${returnedBy}</li>
      <li><strong>Quantity Returned:</strong> ${quantity}</li>
      <li><strong>Condition:</strong> ${condition}</li>
      <li><strong>Remarks:</strong> ${remarks || "None"}</li>
      <li><strong>Processed By:</strong> ${processedBy}</li>
      <li><strong>Status:</strong> ${status}</li>
    </ul>
    <p>Thank you for maintaining proper item accountability.</p>
    <br/>
    <p style="font‑size:0.9em; color:#666;">
      This is an automated email from the Inventory Management System.
    </p>
  </div>
`,

  itemReleased: ({ item, releasedTo, quantity, releasedBy }) => `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>Item Release Notification</h2>
      <p>An item has been released from inventory:</p>
      <ul>
        <li><strong>Item:</strong> ${item}</li>
        <li><strong>Released To:</strong> ${releasedTo}</li>
        <li><strong>Quantity:</strong> ${quantity}</li>
        <li><strong>Released By:</strong> ${releasedBy}</li>
      </ul>
      <p>Please confirm receipt and ensure proper handling.</p>
      <br />
      <p style="font-size: 0.9em; color: #666;">This is an automated email from the Inventory Management System.</p>
    </div>
  `,

 lowStockAlert: ({ item, category, quantity, threshold }) => `
    <h2>⚠️ Low Stock Alert</h2>
    <p><strong>${item}</strong> (${category}) is running low.</p>
    <p>Quantity left: <b>${quantity}</b> (Threshold: ${threshold})</p>
    <p>Please review and restock soon.</p>
  `,

  restockAlert: ({ item, category, quantity, restocker }) => `
    <h2>✅ Restocked Notification</h2>
    <p><strong>${item}</strong> (${category}) has been replenished.</p>
    <p>Restocked by: <b>${restocker}</b></p>
    <p>Current stock: <b>${quantity}</b></p>
    <p>All systems back to normal — no low-stock alert will be triggered until it drops again.</p>
  `,
};



