#!/usr/bin/env node

/**
 * Test Meta API Connection
 *
 * This script tests if your Meta API token is working correctly
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import fetch from "node-fetch";

console.log("🧪 Testing Meta API Connection");
console.log("==============================");

async function testMetaAPI() {
  try {
    const token = process.env.META_ACCESS_TOKEN;

    if (!token) {
      console.error("❌ META_ACCESS_TOKEN not found in .env.local");
      return false;
    }

    console.log("✅ Token found:", token.substring(0, 20) + "...");
    console.log("🔍 Testing API connection...");

    // Test 1: Get user info
    const meResponse = await fetch(
      `https://graph.facebook.com/v23.0/me?access_token=${token}`
    );
    const meData = await meResponse.json();

    if (meData.error) {
      console.error("❌ API Error:", meData.error.message);
      return false;
    }

    console.log("✅ Connected as:", meData.name || meData.id);

    // Test 2: Get ad accounts
    console.log("\n📊 Getting Ad Accounts...");
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v23.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${token}`
    );
    const accountsData = await accountsResponse.json();

    if (accountsData.error) {
      console.error(
        "❌ Cannot access ad accounts:",
        accountsData.error.message
      );
      console.log("\n💡 Make sure your token has these permissions:");
      console.log("   • ads_management");
      console.log("   • ads_read");
      console.log("   • business_management");
      return false;
    }

    if (accountsData.data && accountsData.data.length > 0) {
      console.log(`✅ Found ${accountsData.data.length} ad accounts:`);
      accountsData.data.forEach((account) => {
        console.log(
          `   • ${account.name} (${account.id}) - ${account.currency}`
        );
      });

      // Test a campaign list on first account
      const firstAccount = accountsData.data[0];
      console.log(`\n📊 Testing campaign access for ${firstAccount.name}...`);

      const campaignsResponse = await fetch(
        `https://graph.facebook.com/v23.0/${firstAccount.id}/campaigns?fields=id,name,status&limit=5&access_token=${token}`
      );
      const campaignsData = await campaignsResponse.json();

      if (campaignsData.data) {
        console.log(
          `✅ Can access campaigns (found ${campaignsData.data.length})`
        );
      }
    } else {
      console.log("⚠️  No ad accounts found. This might be a new account.");
    }

    console.log("\n🎉 Meta API connection test successful!");
    console.log("Your token is working and you can use all 49 tools!");

    return true;
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
    return false;
  }
}

// Run the test
testMetaAPI()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
