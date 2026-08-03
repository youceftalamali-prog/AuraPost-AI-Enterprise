import { JwtService } from "../server/identity/services/JwtService.ts";
import { DatabaseManager } from "../server/db.ts";

const BASE_URL = "http://localhost:3000";

async function runAudit() {
  console.log("=========================================================");
  console.log("      AuraPost AI — Core Application & Api Audit        ");
  console.log("=========================================================");

  let token = "";
  let email = `audit.user.${Date.now()}@example.com`;
  let password = "SuperSecretPassword123!";

  const report: Array<{ name: string; status: "PASS" | "FAIL"; details: string }> = [];

  async function testEndpoint(name: string, path: string, options: RequestInit = {}): Promise<any> {
    try {
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((options.headers || {}) as Record<string, string>),
      };

      const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }

      if (res.ok) {
        report.push({ name, status: "PASS", details: `HTTP ${res.status}` });
        return data;
      } else {
        report.push({
          name,
          status: "FAIL",
          details: `HTTP ${res.status}: ${typeof data === "object" ? JSON.stringify(data) : text}`,
        });
        return null;
      }
    } catch (err: any) {
      report.push({ name, status: "FAIL", details: err.message || String(err) });
      return null;
    }
  }

  // 1. Health check
  console.log("\nTesting API Health...");
  await testEndpoint("API Health Check", "/api/health");

  // 2. Authentication Flow
  console.log("\nTesting Registration...");
  const regResult = await testEndpoint("User Registration", "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Audit",
      lastName: "User",
      email,
      password,
      confirmPassword: password,
      acceptTerms: true,
    }),
  });

  if (regResult) {
    console.log("Testing Login...");
    const loginResult = await testEndpoint("User Login", "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (loginResult && loginResult.accessToken) {
      token = loginResult.accessToken;
      console.log("Successfully authenticated. Acquired Bearer token.");
    }
  }

  if (!token) {
    console.error("FATAL: Failed to acquire authentication token. Aborting further authorized tests.");
    printReport(report);
    process.exit(1);
  }

  // 2b. Database seeding of mock product for robust downstream testing
  const db = await DatabaseManager.getInstance();
  const workspaceId = "default-workspace";
  
  // Clean start in Fallback/SQLite mode: seed a product if none exists
  const existingProducts = await db.getProducts(workspaceId);
  let productId = "prod_123";
  if (existingProducts.length === 0) {
    console.log("Seeding a mock product for API audit...");
    await db.dbRun(
      `INSERT INTO products (id, workspace_id, title, description, images, gallery, variants, specifications, vendor, price, compare_at_price, currency, availability, created_at)
       VALUES ($id, $workspaceId, $title, $description, $images, $gallery, $variants, $specifications, $vendor, $price, $compareAtPrice, $currency, $availability, $createdAt)`,
      {
        $id: productId,
        $workspaceId: workspaceId,
        $title: "Premium Luxury Watch",
        $description: "A beautiful premium luxury watch styled with a minimal modern aesthetic.",
        $images: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
        $gallery: JSON.stringify(["https://images.unsplash.com/photo-1523275335684-37898b6baf30"]),
        $variants: JSON.stringify([{ title: "Default", price: "299.00", sku: "WATCH-01" }]),
        $specifications: JSON.stringify({ material: "Stainless Steel" }),
        $vendor: "AuraTime",
        $price: 299.00,
        $compareAtPrice: 399.00,
        $currency: "USD",
        $availability: 1,
        $createdAt: new Date().toISOString()
      }
    );
    await db.saveToDisk();
  } else {
    productId = existingProducts[0].id;
  }

  // 3. Workspace
  console.log("\nTesting Workspace Retrieval...");
  await testEndpoint("Workspace Details", "/api/workspace");

  // 4. Billing manager
  console.log("\nTesting Billing & Account...");
  await testEndpoint("Billing Overview", "/api/billing/overview");
  await testEndpoint("Billing Analytics", "/api/billing/analytics");
  await testEndpoint("PayPal Credit Packs", "/api/billing/paypal/credit-packs");

  // 5. Products Catalog
  console.log("\nTesting Products & Operations...");
  await testEndpoint("Products Catalog", "/api/products");
  await testEndpoint("Background Operations", "/api/operations");
  await testEndpoint("Audit Logs", "/api/audit-logs");

  // 6. Social & Publishing
  console.log("\nTesting Publishing & Social Connections...");
  await testEndpoint("Meta Diagnostics", "/api/publishing/meta-diagnostics");
  await testEndpoint("Social Connected Accounts", "/api/publishing/accounts");
  await testEndpoint("Publishing Content Sources", `/api/publishing/content-sources?productId=${productId}`);
  await testEndpoint("Calendar View Posts", "/api/publishing/posts/calendar");
  await testEndpoint("Posts History", "/api/publishing/posts/history");
  await testEndpoint("Queued Posts", "/api/publishing/posts/queue");
  await testEndpoint("Social Analytics", "/api/publishing/analytics");

  // 7. AI Content Generation
  console.log("\nTesting AI Content Generation...");
  await testEndpoint("AI Content Generator (Mock)", "/api/content/generate", {
    method: "POST",
    body: JSON.stringify({
      productId,
      title: "Premium Leather Jacket",
      customPrompt: "Create a conversion-focused ad hook",
      contentType: "package"
    }),
  });

  // 8. Video Studio & Queues
  console.log("\nTesting Video Studio & Queues...");
  await testEndpoint("Video Providers List", "/api/video/providers");
  await testEndpoint("Queue Center Overview", "/api/queue/overview");
  await testEndpoint("Queue Active Jobs", "/api/queue/jobs");

  // 9. AI Providers Configuration
  console.log("\nTesting AI Providers Settings...");
  await testEndpoint("AI Providers List", "/api/ai-providers");
  await testEndpoint("AI Providers Routing", "/api/ai-providers/routing");
  await testEndpoint("AI Providers Usage Tracker", "/api/ai-providers/usage");

  // 10. Image Studio
  console.log("\nTesting Image Studio...");
  await testEndpoint("Image Projects List", "/api/images/projects");

  await testEndpoint("AI Image Generation (Mock)", "/api/images/generate", {
    method: "POST",
    body: JSON.stringify({
      prompt: "A beautiful commercial mockup of a luxury watch",
      provider: "google_imagen",
      aspectRatio: "1:1",
    }),
  });

  await testEndpoint("AI Image Analysis / Vision (Mock)", "/api/images/analyze", {
    method: "POST",
    body: JSON.stringify({
      productTitle: "Premium Luxury Watch",
      imageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    }),
  });

  printReport(report);
}

function printReport(report: Array<{ name: string; status: "PASS" | "FAIL"; details: string }>) {
  console.log("\n=========================================================");
  console.log("               AUDIT & TEST SYSTEM REPORT                ");
  console.log("=========================================================");
  
  let passes = 0;
  let fails = 0;

  for (const item of report) {
    const statusText = item.status === "PASS" ? "🟢 PASS" : "🔴 FAIL";
    if (item.status === "PASS") passes++;
    else fails++;
    console.log(`${statusText.padEnd(8)} | ${item.name.padEnd(40)} | ${item.details}`);
  }

  console.log("=========================================================");
  console.log(`TOTAL TESTS: ${report.length} | PASSED: ${passes} | FAILED: ${fails}`);
  console.log("=========================================================");
  
  if (fails > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit();
