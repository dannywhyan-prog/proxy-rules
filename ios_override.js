const main = (config) => {

  // ================================================================
  // 1. iOS 专属基础与低内存优化配置
  // ================================================================
  config["mode"] = "rule";
  config["unified-delay"] = true;
  config["tcp-concurrent"] = true;
  config["log-level"] = "error";
  config["ipv6"] = false;
  config["allow-lan"] = false;
  config["find-process-mode"] = "off";
  config["keep-alive-interval"] = 30;

  config["profile"] = {
    "store-selected": true,
    "store-fake-ip": false
  };

  if (config["tun"]) {
    delete config["tun"];
  }

  // ================================================================
  // 2. DNS 配置 (Fake-IP + 国内外分流 + 苹果系统/专用代理放行)
  // ================================================================
  config["dns"] = {
    "enable": true,
    "listen": "0.0.0.0:53",
    "prefer-h3": false,
    "ipv6": false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": [
      "+.lan", "+.local", "+.localhost", "+.home.arpa",
      "+.push.apple.com", "+.icloud.com", "+.apple.com",
      "mask.icloud.com", "mask-h2.icloud.com",
      "mesu.apple.com", "swscan.apple.com", "captive.apple.com",
      "time.*.com", "time.*.gov", "pool.ntp.org",
      "+.weixin.qq.com", "+.wechat.com", "+.qpic.cn", "+.wx.qq.com",
      "+.qlogo.cn", "+.tenpay.com", "+.wechatpay.cn", "+.servicewechat.com",
      "+.alipay.com", "+.alipayobjects.com", "+.taobao.com", "+.alicdn.com",
      "+.jd.com", "+.360buyimg.com", "+.360buy.com", "+.jcloudcs.com",
      "+.douyin.com", "+.amemv.com", "+.pstatp.com", "+.bilivideo.com", "+.bilibili.com",
      "+.music.163.com", "+.y.qq.com", "+.baidupcs.com"
    ],
    "default-nameserver": ["223.5.5.5", "119.29.29.29"],
    "nameserver": [
      "https://dns.alidns.com/dns-query",
      "https://doh.pub/dns-query"
    ],
    "nameserver-policy": {
      "geosite:cn,private": [
        "https://dns.alidns.com/dns-query",
        "https://doh.pub/dns-query"
      ],
      "geolocation-!cn": [
        "https://cloudflare-dns.com/dns-query",
        "https://dns.google/dns-query"
      ]
    },
    "direct-nameserver": [
      "https://dns.alidns.com/dns-query",
      "https://doh.pub/dns-query"
    ],
    "fallback": [
      "https://cloudflare-dns.com/dns-query",
      "https://dns.google/dns-query"
    ],
    "fallback-filter": {
      "geoip": true,
      "geoip-code": "CN",
      "geosite": ["gfw"]
    },
    "proxy-server-nameserver": ["223.5.5.5", "119.29.29.29"]
  };

  // ================================================================
  // 3. 域名嗅探配置
  // ================================================================
  config["sniffer"] = {
    "enable": true,
    "parse-pure-ip": false,
    "force-dns-mapping": true,
    "override-destination": true,
    "sniff": {
      "HTTP": { "ports": [80, "8080-8880"] },
      "TLS": { "ports": [443, 8443] },
      "QUIC": { "ports": [443, 8443] }
    },
    "skip-domain": [
      "+.push.apple.com", "+.icloud.com",
      "+.weixin.qq.com", "+.wechat.com", "+.wx.qq.com",
      "+.tenpay.com", "+.wechatpay.cn", "+.servicewechat.com",
      "+.alipay.com", "+.alipayobjects.com",
      "+.jd.com", "+.douyin.com", "+.amemv.com"
    ]
  };

  // ================================================================
  // 4. 动态提取节点并按国家/地区归类（无节点地区自动隐藏）
  // ================================================================
  const originalProxies = Array.isArray(config["proxies"]) ? config["proxies"] : [];

  const invalidRegex = /(群|邀请|返利|循环|官网|客服|网站|网址|获取|订阅|到期|下次|重置|剩余流量|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|无法|说明|特别|教程|关注|更新|作者|加入|超时|失联|\b(USE|USED|TOTAL|EXPIRE|EMAIL|Panel|Channel|Traffic)\b|\d{4}-\d{2}-\d{2})/i;

  const proxyNames = originalProxies
    .filter(p => p && p.name && !invalidRegex.test(p.name))
    .map(p => p.name);

  const regionPatterns = {
    "香港": [/香港/i, /\bHK\b/i, /HKG/i, /Hong\s*Kong/i, /HongKong/i],
    "台湾": [/台湾/i, /台灣/i, /\bTW\b/i, /TPE/i, /Taiwan/i],
    "日本": [/日本/i, /\bJP\b/i, /NRT/i, /HND/i, /KIX/i, /Japan/i, /Tokyo/i],
    "新加坡": [/新加坡/i, /\bSG\b/i, /SIN/i, /Singapore/i],
    "美国": [/美国/i, /\bUS\b/i, /\bUSA\b/i, /United\s*States/i, /America/i],
    "韩国": [/韩国/i, /韓國/i, /\bKR\b/i, /KOR/i, /Korea/i, /Seoul/i]
  };

  const regionNodes = {
    "香港": [], "台湾": [], "日本": [], "新加坡": [], "美国": [], "韩国": [], "其他地区": []
  };

  proxyNames.forEach((name) => {
    let matched = false;
    for (const [reg, pats] of Object.entries(regionPatterns)) {
      if (pats.some(p => p.test(name))) {
        regionNodes[reg].push(name);
        matched = true;
        break;
      }
    }
    if (!matched) {
      regionNodes["其他地区"].push(name);
    }
  });

  const regionIcons = {
    "香港": "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png",
    "台湾": "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png",
    "日本": "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Japan.png",
    "新加坡": "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Singapore.png",
    "美国": "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_States.png",
    "韩国": "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Korea.png",
    "其他地区": "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Global.png"
  };

  const activeRegionGroups = [];
  const availableRegionNames = [];

  Object.entries(regionNodes).forEach(([regName, nodes]) => {
    if (nodes.length > 0) {
      activeRegionGroups.push({
        name: regName,
        type: "url-test",
        proxies: nodes,
        url: "http://cp.cloudflare.com/generate_204",
        interval: 300,
        tolerance: 50,
        lazy: true,
        icon: regionIcons[regName]
      });
      availableRegionNames.push(regName);
    }
  });

  // ================================================================
  // 5. 全场景核心策略组 (自动排除香港限制服务)
  // ================================================================
  const iconBase = "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/icons/";
  const nonHkRegions = availableRegionNames.filter(r => !r.includes("香港"));

  const coreGroups = [
    {
      name: "节点选择",
      type: "select",
      proxies: ["自动选择", "手动选择", ...availableRegionNames, "DIRECT"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png"
    },
    {
      name: "自动选择",
      type: "url-test",
      proxies: proxyNames.slice(),
      url: "http://cp.cloudflare.com/generate_204",
      interval: 300,
      tolerance: 50,
      lazy: true,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Auto.png"
    },
    {
      name: "手动选择",
      type: "select",
      proxies: proxyNames.slice(),
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Direct.png"
    },
    {
      name: "AI平台",
      type: "select",
      proxies: [...nonHkRegions, "手动选择", "节点选择"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/ChatGPT.png"
    },
    {
      name: "TikTok",
      type: "select",
      proxies: [...nonHkRegions, "手动选择", "节点选择"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/TikTok.png"
    },
    {
      name: "国外媒体",
      type: "select",
      proxies: ["节点选择", "手动选择", ...availableRegionNames],
      icon: iconBase + "YouTube.png"
    },
    {
      name: "电报消息",
      type: "select",
      proxies: ["节点选择", "手动选择", ...availableRegionNames],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Telegram.png"
    },
    {
      name: "谷歌服务",
      type: "select",
      proxies: ["节点选择", "手动选择", ...availableRegionNames, "DIRECT"],
      icon: iconBase + "Google.png"
    },
    {
      name: "苹果服务",
      type: "select",
      proxies: ["DIRECT", "节点选择"],
      icon: iconBase + "Apple.png"
    },
    {
      name: "微软服务",
      type: "select",
      proxies: ["DIRECT", "节点选择", ...availableRegionNames],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Microsoft.png"
    },
    {
      name: "漏网之鱼",
      type: "select",
      proxies: ["节点选择", "DIRECT"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Final.png"
    }
  ];

  config["proxy-groups"] = [...coreGroups, ...activeRegionGroups];

  // ================================================================
  // 6. 远程规则提供器
  // ================================================================
  const ruleBase = "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/";
  const mkRule = (f) => ({
    type: "http",
    behavior: "classical",
    format: "yaml",
    url: ruleBase + f,
    path: "./rules/" + f,
    interval: 86400
  });

  config["rule-providers"] = {
    "AI": mkRule("ai.yaml"),
    "TikTok": mkRule("tiktok.yaml"),
    "YouTube": mkRule("youtube.yaml"),
    "Netflix": mkRule("netflix.yaml"),
    "Spotify": mkRule("spotify.yaml"),
    "Telegram": mkRule("telegram.yaml"),
    "Google": mkRule("google.yaml"),
    "Apple": mkRule("apple.yaml"),
    "Microsoft": mkRule("microsoft.yaml")
  };

  // ================================================================
  // 7. iOS 全场景分流规则
  // ================================================================
  config["rules"] = [
    "DOMAIN-SUFFIX,lan,DIRECT",
    "DOMAIN-SUFFIX,local,DIRECT",
    "DOMAIN-SUFFIX,localhost,DIRECT",
    "DOMAIN,mask.icloud.com,DIRECT",
    "DOMAIN,mask-h2.icloud.com,DIRECT",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "DOMAIN-SUFFIX,speedtest.net,DIRECT",
    "DOMAIN-SUFFIX,ooklaserver.net,DIRECT",
    "DOMAIN-KEYWORD,speedtest,DIRECT",
    "DOMAIN-SUFFIX,weixin.qq.com,DIRECT",
    "DOMAIN-SUFFIX,wechat.com,DIRECT",
    "DOMAIN-SUFFIX,qpic.cn,DIRECT",
    "DOMAIN-SUFFIX,weixin.com,DIRECT",
    "DOMAIN-SUFFIX,wx.qq.com,DIRECT",
    "DOMAIN-SUFFIX,qlogo.cn,DIRECT",
    "DOMAIN-SUFFIX,tenpay.com,DIRECT",
    "DOMAIN-SUFFIX,wechatpay.cn,DIRECT",
    "DOMAIN-SUFFIX,servicewechat.com,DIRECT",
    "DOMAIN-KEYWORD,weixin,DIRECT",
    "IP-CIDR,101.32.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,109.244.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,129.226.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,183.3.224.0/19,DIRECT,no-resolve",
    "DOMAIN-SUFFIX,alipay.com,DIRECT",
    "DOMAIN-SUFFIX,alipayobjects.com,DIRECT",
    "DOMAIN-SUFFIX,taobao.com,DIRECT",
    "DOMAIN-SUFFIX,tmall.com,DIRECT",
    "DOMAIN-SUFFIX,alicdn.com,DIRECT",
    "DOMAIN-SUFFIX,amap.com,DIRECT",
    "DOMAIN-SUFFIX,dingtalk.com,DIRECT",
    "DOMAIN-SUFFIX,byteimg.com,DIRECT",
    "DOMAIN-SUFFIX,dcdapp.com,DIRECT",
    "DOMAIN-SUFFIX,dongchedi.com,DIRECT",
    "DOMAIN-KEYWORD,douyinvod,DIRECT",
    "DOMAIN-SUFFIX,amemv.com,DIRECT",
    "DOMAIN-SUFFIX,pstatp.com,DIRECT",
    "DOMAIN-SUFFIX,douyin.com,DIRECT",
    "DOMAIN-SUFFIX,bilibili.com,DIRECT",
    "DOMAIN-SUFFIX,bilivideo.com,DIRECT",
    "DOMAIN-SUFFIX,hdslb.com,DIRECT",
    "DOMAIN-SUFFIX,xiaohongshu.com,DIRECT",
    "DOMAIN-SUFFIX,xhscdn.com,DIRECT",
    "DOMAIN-SUFFIX,meituan.com,DIRECT",
    "DOMAIN-SUFFIX,dianping.com,DIRECT",
    "DOMAIN-SUFFIX,pinduoduo.com,DIRECT",
    "DOMAIN-SUFFIX,yangkeduo.com,DIRECT",
    "DOMAIN-SUFFIX,baidu.com,DIRECT",
    "DOMAIN-SUFFIX,baidupcs.com,DIRECT",
    "DOMAIN-SUFFIX,163.com,DIRECT",
    "DOMAIN-SUFFIX,126.net,DIRECT",
    "DOMAIN-SUFFIX,qq.com,DIRECT",
    "DOMAIN-SUFFIX,12306.cn,DIRECT",
    "DOMAIN-SUFFIX,jd.com,DIRECT",
    "DOMAIN-SUFFIX,360buy.com,DIRECT",
    "DOMAIN-SUFFIX,360buyimg.com,DIRECT",
    "DOMAIN-SUFFIX,jcloudcs.com,DIRECT",
    "DOMAIN-SUFFIX,jdpay.com,DIRECT",
    "DOMAIN-SUFFIX,ithome.com,DIRECT",
    "DOMAIN-SUFFIX,ruanmei.com,DIRECT",
    "AND,((DST-PORT,443),(NETWORK,udp),(DOMAIN-SUFFIX,googlevideo.com)),REJECT",
    "AND,((DST-PORT,443),(NETWORK,udp),(DOMAIN-SUFFIX,youtube.com)),REJECT",
    "DOMAIN,s.youtube.com,REJECT",
    "DOMAIN,video-stats.l.google.com,REJECT",
    "DOMAIN-SUFFIX,googlesyndication.com,REJECT",
    "DOMAIN-SUFFIX,googleadservices.com,REJECT",
    "DOMAIN,youtubei.googleapis.com,国外媒体",
    "RULE-SET,AI,AI平台",
    "RULE-SET,TikTok,TikTok",
    "RULE-SET,YouTube,国外媒体",
    "RULE-SET,Netflix,国外媒体",
    "RULE-SET,Spotify,国外媒体",
    "RULE-SET,Telegram,电报消息",
    "RULE-SET,Google,谷歌服务",
    "RULE-SET,Apple,苹果服务",
    "RULE-SET,Microsoft,微软服务",
    "GEOSITE,private,DIRECT",
    "GEOIP,private,DIRECT,no-resolve",
    "GEOSITE,cn,DIRECT",
    "GEOIP,cn,DIRECT,no-resolve",
    "MATCH,漏网之鱼"
  ];

  return config;
};
