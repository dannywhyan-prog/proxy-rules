// Version: 2026.11.26-Desktop
// 适用客户端: macOS / Windows 版 Clash Mi、Clash Verge Rev、FlClash Desktop (Mihomo 内核)
// 特点: 零 DNS 泄露隔离、桌面高吞吐 system/mixed 栈、放行 AirDrop/局域网共享与开发服务

function main(config) {
  return buildBaseConfig(config, {
    tunStack: "mixed",
    extraFakeIpFilter: [
      "*.localdomain",
      "*.example",
      "*.invalid",
      "*.localhost",
      "*.test",
      "*.home.arpa",
      "+.push.apple.com",
      "+.icloud.com",
      "+.mzstatic.com",
      "*.tailscale.com",
      "*.ts.net"
    ],
    extraTunConfig: {
      "strict-route": true
    }
  });
}

// 1. 节点地区自动分组与空节点容错保护
const regionConfig = [
  { name: "🇭🇰 香港节点", regex: /港|HK|Hong Kong|HongKong/i },
  { name: "🇹🇼 台湾节点", regex: /台|TW|Taiwan|Taipei/i },
  { name: "🇯🇵 日本节点", regex: /日|JP|Japan|Tokyo|Osaka/i },
  { name: "🇸🇬 新加坡节点", regex: /新|狮城|SG|Singapore/i },
  { name: "🇰🇷 韩国节点", regex: /韩|KR|Korea|Seoul/i },
  { name: "🇺🇸 美国节点", regex: /美|US|United States|America|Los Angeles|San Jose|Seattle/i },
  { name: "🇨🇦 加拿大节点", regex: /加|CA|Canada|Toronto|Vancouver/i },
  { name: "🇬🇧 英国节点", regex: /英|UK|United Kingdom|Britain|London/i }
];

const ruleProviders = {
  reject_youtube: {
    type: "http",
    behavior: "domain",
    url: "https://ghfast.top/https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/reject.txt",
    path: "./ruleset/reject.yaml",
    interval: 86400
  },
  private: {
    type: "http",
    behavior: "domain",
    url: "https://ghfast.top/https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/private.txt",
    path: "./ruleset/private.yaml",
    interval: 86400
  },
  cncidr: {
    type: "http",
    behavior: "ipcidr",
    url: "https://ghfast.top/https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/cncidr.txt",
    path: "./ruleset/cncidr.yaml",
    interval: 86400
  },
  direct: {
    type: "http",
    behavior: "domain",
    url: "https://ghfast.top/https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/direct.txt",
    path: "./ruleset/direct.yaml",
    interval: 86400
  },
  proxy: {
    type: "http",
    behavior: "domain",
    url: "https://ghfast.top/https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/proxy.txt",
    path: "./ruleset/proxy.yaml",
    interval: 86400
  },
  telegramcidr: {
    type: "http",
    behavior: "ipcidr",
    url: "https://ghfast.top/https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/telegramcidr.txt",
    path: "./ruleset/telegramcidr.yaml",
    interval: 86400
  }
};

function buildBaseConfig(config, platformOptions) {
  const proxies = config.proxies || [];
  const allProxyNames = proxies.map(p => p.name);
  if (allProxyNames.length === 0) return config;

  const matchedSet = new Set();
  const regionGroups = [];
  const availableRegionNames = [];

  for (const reg of regionConfig) {
    const matched = allProxyNames.filter(name => reg.regex.test(name));
    matched.forEach(n => matchedSet.add(n));
    const groupProxies = matched.length > 0 ? matched : ["DIRECT"];
    if (matched.length > 0) {
      availableRegionNames.push(reg.name);
    }
    regionGroups.push({
      name: reg.name,
      type: "url-test",
      url: "https://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      proxies: groupProxies
    });
  }

  const otherProxies = allProxyNames.filter(name => !matchedSet.has(name));
  if (otherProxies.length > 0) {
    availableRegionNames.push("🌐 其他地区");
  }
  regionGroups.push({
    name: "🌐 其他地区",
    type: "select",
    proxies: otherProxies.length > 0 ? otherProxies : ["DIRECT"]
  });

  const mainSelectorOptions = [
    "♻️ 自动选择",
    ...availableRegionNames,
    "DIRECT",
    ...allProxyNames
  ];

  const serviceSelectorOptions = [
    "🚀 节点选择",
    ...availableRegionNames,
    "♻️ 自动选择",
    "DIRECT"
  ];

  const aiSelectorOptions = [
    ...availableRegionNames.filter(n => !n.includes("香港")),
    "🚀 节点选择",
    ...allProxyNames.filter(n => !/港|HK|Hong Kong/i.test(n))
  ];
  if (aiSelectorOptions.length === 0) aiSelectorOptions.push("🚀 节点选择");

  const serviceGroups = [
    { name: "🚀 节点选择", type: "select", proxies: mainSelectorOptions },
    { name: "♻️ 自动选择", type: "url-test", url: "https://www.gstatic.com/generate_204", interval: 300, tolerance: 50, proxies: allProxyNames },
    { name: "🤖 AI 服务", type: "select", proxies: aiSelectorOptions },
    { name: "📹 YouTube", type: "select", proxies: serviceSelectorOptions },
    { name: "🔍 Google", type: "select", proxies: serviceSelectorOptions },
    { name: "🐙 GitHub", type: "select", proxies: serviceSelectorOptions },
    { name: "🎬 Netflix", type: "select", proxies: serviceSelectorOptions },
    { name: "🎵 Spotify", type: "select", proxies: serviceSelectorOptions },
    { name: "🎮 Steam", type: "select", proxies: ["DIRECT", ...serviceSelectorOptions] },
    { name: "📲 Telegram", type: "select", proxies: serviceSelectorOptions },
    { name: "🎵 TikTok", type: "select", proxies: aiSelectorOptions },
    { name: "🍎 Apple", type: "select", proxies: ["DIRECT", ...serviceSelectorOptions] },
    { name: "🪟 Microsoft", type: "select", proxies: ["DIRECT", ...serviceSelectorOptions] },
    { name: "⚡ 测速工具", type: "select", proxies: ["DIRECT", ...serviceSelectorOptions] },
    { name: "🐟 漏网之鱼", type: "select", proxies: ["🚀 节点选择", "DIRECT"] }
  ];

  config["proxy-groups"] = [
    ...serviceGroups,
    ...regionGroups
  ];

  // 四段式防 DNS 泄露配置 (关闭易泄露的 fallback，依赖 nameserver-policy + respect-rules 严格隔离)
  config["dns"] = {
    "enable": true,
    "listen": "0.0.0.0:1053",
    "ipv6": false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "use-hosts": true,
    "respect-rules": true,
    "default-nameserver": [
      "223.5.5.5",
      "119.29.29.29"
    ],
    "proxy-server-nameserver": [
      "https://dns.alidns.com/dns-query",
      "https://doh.pub/dns-query"
    ],
    "nameserver": [
      "https://dns.alidns.com/dns-query",
      "https://doh.pub/dns-query"
    ],
    "nameserver-policy": {
      "geosite:cn,private": [
        "https://dns.alidns.com/dns-query",
        "https://doh.pub/dns-query"
      ],
      "geosite:geolocation-!cn": [
        "https://dns.google/dns-query#🚀 节点选择",
        "https://cloudflare-dns.com/dns-query#🚀 节点选择"
      ]
    },
    "fake-ip-filter": [
      "*.lan",
      "*.local",
      "localhost.ptlogin2.qq.com",
      "+.srv.nintendo.net",
      "+.stun.playstation.net",
      "xbox.*.microsoft.com",
      "+.xboxlive.com",
      "+.msftconnecttest.com",
      "+.msftncsi.com",
      "time.*.com",
      "ntp.*.com",
      "+.pool.ntp.org",
      ...platformOptions.extraFakeIpFilter
    ]
  };

  config["tun"] = {
    "enable": true,
    "stack": platformOptions.tunStack,
    "dns-hijack": ["any:53", "tcp://any:53"],
    "auto-route": true,
    "auto-detect-interface": true,
    ...platformOptions.extraTunConfig
  };

  config["sniffer"] = {
    "enable": true,
    "force-dns-mapping": true,
    "parse-pure-ip": true,
    "sniff": {
      "HTTP": { "ports": [80, "8080-8880"], "override-destination": true },
      "TLS": { "ports": [443, 8443] },
      "QUIC": { "ports": [443, 8443] }
    }
  };

  config["rule-providers"] = ruleProviders;

  // 克制型分流规则：仅保留 YouTube 广告及 QUIC/UDP 443 屏蔽，避免误伤微信/抖音/京东
  config["rules"] = [
    // 局域网与私有地址直连
    "RULE-SET,private,DIRECT",
    "GEOIP,PRIVATE,DIRECT,no-resolve",

    // 仅保留 YouTube 去广告与屏蔽 QUIC 强制走 TCP 提升去广告效果
    "AND,((DOMAIN-SUFFIX,googlevideo.com),(NETWORK,UDP),(DST-PORT,443)),REJECT",
    "DOMAIN-SUFFIX,doubleclick.net,REJECT",
    "DOMAIN-SUFFIX,googleadservices.com,REJECT",
    "DOMAIN-SUFFIX,googlesyndication.com,REJECT",

    // 常用服务精准分流
    "GEOSITE,openai,🤖 AI 服务",
    "GEOSITE,anthropic,🤖 AI 服务",
    "DOMAIN-SUFFIX,gemini.google.com,🤖 AI 服务",
    "DOMAIN-SUFFIX,claude.ai,🤖 AI 服务",
    "DOMAIN-SUFFIX,perplexity.ai,🤖 AI 服务",

    "GEOSITE,youtube,📹 YouTube",
    "GEOSITE,github,🐙 GitHub",
    "GEOSITE,google,🔍 Google",
    "GEOSITE,netflix,🎬 Netflix",
    "GEOSITE,spotify,🎵 Spotify",
    "GEOSITE,steam,🎮 Steam",
    "GEOSITE,telegram,📲 Telegram",
    "RULE-SET,telegramcidr,📲 Telegram,no-resolve",
    "GEOSITE,tiktok,🎵 TikTok",
    "GEOSITE,apple,🍎 Apple",
    "GEOSITE,microsoft,🪟 Microsoft",
    "GEOSITE,speedtest,⚡ 测速工具",

    // 国内直连与海外代理兜底
    "RULE-SET,direct,DIRECT",
    "GEOSITE,cn,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",
    "RULE-SET,proxy,🚀 节点选择",
    "MATCH,🐟 漏网之鱼"
  ];

  return config;
}
