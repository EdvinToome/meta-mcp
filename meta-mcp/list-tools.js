#!/usr/bin/env node

/**
 * List All Tools Script
 * 
 * This script lists all tool names from the source files for easy reference
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log("🛠️  Complete Tool List");
console.log("====================");

const toolFiles = [
  'src/tools/campaigns.ts',
  'src/tools/analytics.ts',
  'src/tools/audiences.ts',
  'src/tools/creatives.ts',
  'src/tools/oauth.ts'
];

let totalTools = 0;

toolFiles.forEach(file => {
  try {
    const content = readFileSync(file, 'utf8');
    const toolMatches = content.match(/server\.tool\(\s*["']([^"']+)["']/g) || [];
    
    const toolNames = toolMatches.map(match => {
      const nameMatch = match.match(/["']([^"']+)["']/);
      return nameMatch ? nameMatch[1] : '';
    }).filter(name => name);
    
    console.log(`\n📁 ${file.replace('src/tools/', '').replace('.ts', '').toUpperCase()} (${toolNames.length} tools):`);
    toolNames.forEach(name => {
      console.log(`   • ${name}`);
    });
    
    totalTools += toolNames.length;
  } catch (error) {
    console.error(`❌ Error reading ${file}:`, error.message);
  }
});

console.log(`\n📊 Total: ${totalTools} tools`);
console.log("\n✅ All tools listed successfully!");