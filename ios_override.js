// Version: 2026.11.26-iOS
// 适用客户端: iOS 版 Clash Mi (Mihomo / Clash Meta 内核)
// 特点: 严格适配 iOS Network Extension 50MB 内存上限（精简测速组并发与规则集体积）、零 DNS 泄露、保留系统推送与苹果生态直连、仅保留 YouTube 去广告

function main(config) {
  const proxies = config.proxies || [];
  const allProxyNames = proxies.map(p => p.name);
  if (allProxyNames.length === 0) return config;

  // 1. 地区自动分组（iOS 专用优化：拉长测速间隔至 600s 降低后台内存与电量消耗，空节点自动回退 DIRECT）
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
      interval: 600,
      tolerance: 50,
      lazy: true, // iOS 关键优化：仅在选中该分组时才触发测速，防止后台内存溢出被系统杀进程
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
    { name: "♻️ 自动选择", type: "url-test", url: "https://www.gstatic.com/generate_204", interval: 600, tolerance: 50, lazy: true, proxies: allProxyNames },
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

  // 2. 四段式零 DNS 泄露隔离（关闭 fallback，防止 iOS 后台并发泄露本地运营商 DNS）
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
    // iOS 专用 Fake-IP 白名单：放行 APNs 苹果推送、iCloud、CarPlay/局域网发现、系统时间校准
    "fake-ip-filter": [
      "*.lan",
      "*.local",
      "localhost.ptlogin2.qq.com",
      "+.push.apple.com",
      "+.icloud.com",
      "+.icloud-content.com",
      "+.mzstatic.com",
      "+.itunes.apple.com",
      "time.*.com",
      "time.*.apple.com",
      "ntp.*.com",
      "+.pool.ntp.org",
      "+.msftconnecttest.com",
      "+.msftncsi.com",
      "*.tailscale.com",
      "*.ts.net"
    ]
  };

  // 3. iOS 专用 TUN 配置（lightweight mixed 模式，关闭 strict-route 避免触发 iOS 网络扩展限制与蜂窝/Wi-Fi 切换断流）
  config["tun"] = {
    "enable": true,
    "stack": "mixed",
    "dns-hijack": ["any:53", "tcp://any:53"],
    "auto-route": true,
    "auto-detect-interface": true,
    "strict-route": false
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

  // 4. 轻量级规则集（优先使用内置 GEOSITE/GEOIP，仅外挂少量必要 rule-providers，大幅节省 iOS 内存）
  config["rule-providers"] = {
    private: {
      type: "http",
      behavior: "domain",
      url: "https://ghfast.top/https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/private.txt",
      path: "./ruleset/private.yaml",
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

  // 5. 克制型分流规则：仅保留 YouTube 去广告与 QUIC/UDP 443 屏蔽，绝不误伤微信/京东/抖音
  config["rules"] = [
    // 局域网与私有地址直连
    "RULE-SET,private,DIRECT",
    "GEOIP,PRIVATE,DIRECT,no-resolve",

    // 苹果系统核心推送与时间校准强制直连（防锁屏收不到微信/消息推送）
    "DOMAIN-SUFFIX,push.apple.com,DIRECT",
    "DOMAIN,time.apple.com,DIRECT",

    // 仅保留 YouTube 去广告与屏蔽 QUIC 强制走 TCP
    "AND,((DOMAIN-SUFFIX,googlevideo.com),(NETWORK,UDP),(DST-PORT,443)),REJECT",
    "DOMAIN-SUFFIX,doubleclick.net,REJECT",
    "DOMAIN-SUFFIX,googleadservices.com,REJECT",
    "DOMAIN-SUFFIX,googlesyndication.com,REJECT",

    // 常用海外服务精准分流
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

    // 国内直连与海外代理兜底（使用内置 GEOSITE/GEOIP，零额外内存开销）
    "GEOSITE,cn,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",
    "MATCH,🐟 漏网之鱼"
  ];

  return config;
}
