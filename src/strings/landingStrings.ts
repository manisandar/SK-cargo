export interface LandingContent {
  nav: {
    services: string;
    howItWorks: string;
    whyUs: string;
    contact: string;
  };
  hero: {
    tag: string;
    headlineA: string;
    headlineB: string;
    lead: string;
    ctaPrimary: string;
    ctaSecondary: string;
    tagEasy: string;
    tagFast: string;
    tagReliable: string;
    chipShipping: string;
    chipPhoto: string;
    chipStatus: string;
    badgePhoto: string;
    badgeWeight: string;
    badgeBilingual: string;
  };
  ticker: string[];
  services: {
    heading: string;
    subheading: string;
    c1Title: string;
    c1Desc: string;
    c2Title: string;
    c2Desc: string;
    c3Title: string;
    c3Desc: string;
  };
  journey: {
    heading: string;
    subheading: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    step4Title: string;
    step4Desc: string;
  };
  whyUs: {
    heading: string;
    subheading: string;
    point1: string;
    point2: string;
    point3: string;
    point4: string;
  };
  contact: {
    heading: string;
    subheading: string;
    phoneLabel: string;
    phoneDisplay: string;
    phoneHref: string;
    emailLabel: string;
    emailDisplay: string;
    emailHref: string;
    facebookLabel: string;
    facebookHref: string;
    messengerLabel: string;
    messengerHref: string;
    addressLabel: string;
    addressText: string;
    mapsHref: string;
  };
  footer: {
    copyright: string;
    tagline: string;
  };
}

export const landingStrings: Record<'en' | 'my', LandingContent> = {
  en: {
    nav: {
      services: "Services",
      howItWorks: "How It Works",
      whyUs: "Why SK Cargo",
      contact: "Contact Us"
    },
    hero: {
      tag: "Fast · Safe · Transparent",
      headlineA: "Your parcels,",
      headlineB: "packed with care.",
      lead: "Send your parcels to our warehouse. We receive, photograph, pack and deliver them for you, so you always know where your goods are.",
      ctaPrimary: "Contact Us",
      ctaSecondary: "See How It Works",
      tagEasy: "Safe",
      tagFast: "Fast",
      tagReliable: "Reliable",
      chipShipping: "Fast, Safe and Reliable Shipping",
      chipPhoto: "Fast, Safe and Reliable Shipping",
      chipStatus: "Fast, Safe and Reliable Shipping",
      badgePhoto: "100% Photo Proof",
      badgeWeight: "Precise Measurement",
      badgeBilingual: "English & Burmese Support"
    },
    ticker: [
      "Parcel Receiving",
      "HD Photo Records",
      "Master Box Consolidation",
      "Direct Trucking",
      "Door-to-Door Delivery",
      "Transparent Pricing"
    ],
    services: {
      heading: "Everything for your cargo",
      subheading: "From the moment your parcel arrives to the moment it is safely in your hands.",
      c1Title: "Parcel Receiving",
      c1Desc: "We receive parcels under your name, including multiple orders made under different names or shopping aliases, and consolidate them together.",
      c2Title: "HD Photo Records",
      c2Desc: "Every parcel is photographed in high definition and recorded with its exact dimensions, weight in kilograms, arrival date, and timestamp.",
      c3Title: "Master Box Repacking",
      c3Desc: "Parcels are carefully consolidated into heavy-duty big boxes with protective sealing for maximum safety and efficient transport."
    },
    journey: {
      heading: "How It Works",
      subheading: "Four simple, transparent steps from our warehouse to your hands.",
      step1Title: "Parcel Arrives",
      step1Desc: "Your parcel reaches our receiving warehouse facility safely.",
      step2Title: "Photo & Recording",
      step2Desc: "HD photograph, weight in kg, size in inches, and arrival time are logged.",
      step3Title: "Packed in Big Box",
      step3Desc: "Parcels are securely packed into master cartons to ensure full protection.",
      step4Title: "Dispatched & Delivered",
      step4Desc: "Loaded onto our dedicated cargo trucks and delivered right to you."
    },
    whyUs: {
      heading: "Why customers choose SK Cargo",
      subheading: "Clear records, transparent handling, and careful protection every single time.",
      point1: "Clear HD photo and digital record for each parcel",
      point2: "Careful multi-layer packing to protect fragile goods",
      point3: "Friendly customer support in both English and Burmese",
      point4: "Honest weight measurement and dependable delivery schedules"
    },
    contact: {
      heading: "Ready to send your cargo?",
      subheading: "Get in touch with our team today and we will guide you through the process.",
      phoneLabel: "Phone Call",
      phoneDisplay: "+66 064 554 4483",
      phoneHref: "tel:+660645544483",
      emailLabel: "Email Us",
      emailDisplay: "satkyar2024@gmail.com",
      emailHref: "mailto:satkyar2024@gmail.com",
      facebookLabel: "Facebook Page",
      facebookHref: "https://www.facebook.com/profile.php?id=61562897885529",
      messengerLabel: "Facebook Messenger",
      messengerHref: "https://www.facebook.com/messages/t/392106177317220",
      addressLabel: "Warehouse Address",
      addressText: "Bangkok Yai, Thailand, 10150",
      mapsHref: "https://www.google.com/maps/search/?api=1&query=Bangkok+Yai,+Thailand,+10150"
    },
    footer: {
      copyright: "© 2026 SK Cargo. All rights reserved.",
      tagline: "Parcel Receiving & Cargo Service"
    }
  },
  my: {
    nav: {
      services: "ဝန်ဆောင်မှုများ",
      howItWorks: "လုပ်ငန်းစဉ်",
      whyUs: "ဘာကြောင့် SK Cargo",
      contact: "ဆက်သွယ်ရန်"
    },
    hero: {
      tag: "လျင်မြန် · ဘေးကင်း · ပွင့်လင်း",
      headlineA: "သင့်ပါဆယ်များကို",
      headlineB: "ဂရုတစိုက် ထုပ်ပိုး\u200Bပေးပါမည်။",
      lead: "သင့်ပါဆယ်များကို ကျွန်ုပ်တို့ဂိုဒေါင်သို့ပို့ပါ။ လက်ခံ၊ ဓာတ်ပုံရိုက်၊ စနစ်တကျထုပ်ပိုးပြီး အိမ်အရောက်ပို့ဆောင်ပေးသဖြင့် သင့်ကုန်ပစ္စည်းမည်သည့်နေရာရှိသည်ကို အမြဲစိတ်ချစွာ သိရှိနိုင်ပါသည်။",
      ctaPrimary: "ဆက်သွယ်ရန်",
      ctaSecondary: "လုပ်ငန်းစဉ်ကြည့်မည်",
      tagEasy: "လွယ်ကူ",
      tagFast: "မြန်ဆန်",
      tagReliable: "စိတ်ချရ",
      chipShipping: "လွယ်ကူ၊ မြန်ဆန်၊ စိတ်ချရ",
      chipPhoto: "လွယ်ကူ၊ မြန်ဆန်၊ စိတ်ချရ",
      chipStatus: "လွယ်ကူ၊ မြန်ဆန်၊ စိတ်ချရ",
      badgePhoto: "၁၀၀% ဓာတ်ပုံမှတ်တမ်း",
      badgeWeight: "တိကျသော အလေးချိန်နှင့် အရွယ်အစား",
      badgeBilingual: "မြန်မာ/အင်္ဂလိပ် နှစ်ဘာသာ ဝန်ဆောင်မှု"
    },
    ticker: [
      "ပါဆယ်လက်ခံခြင်း",
      "ကြည်လင်သော ဓာတ်ပုံမှတ်တမ်း",
      "သေတ္တာကြီးထဲ စနစ်တကျထုပ်ပိုးခြင်း",
      "လုံခြုံသော သယ်ယူပို့ဆောင်ရေး",
      "အိမ်အရောက် ပို့ဆောင်ပေးခြင်း",
      "ပွင့်လင်းမြင်သာသော စနစ်"
    ],
    services: {
      heading: "သင့်ကုန်စည်အတွက် ပြည့်စုံသောဝန်ဆောင်မှု",
      subheading: "ပါဆယ်ဂိုဒေါင်ရောက်ချိန်မှ သင့်လက်ဝယ်သို့ ဘေးကင်းစွာ ရောက်ရှိချိန်အထိ။",
      c1Title: "ပါဆယ်လက်ခံခြင်း",
      c1Desc: "သင့်အမည်ဖြင့် ပါဆယ်များကို စနစ်တကျလက်ခံပေးပြီး အမည်ကွဲများ၊ ဆိုင်အမည်များဖြင့် မှာထားသော ပါဆယ်များကိုလည်း ပေါင်းစပ်လက်ခံပေးပါသည်။",
      c2Title: "ဓာတ်ပုံနှင့် အချက်အလက်မှတ်တမ်း",
      c2Desc: "ပါဆယ်တိုင်းကို ဓာတ်ပုံကြည်လင်စွာရိုက်ကူးပြီး အလေးချိန် (ကီလို)၊ အရွယ်အစား (လက်မ)၊ ရောက်ရှိရက်စွဲနှင့် အချိန်တိကျစွာ မှတ်တမ်းတင်ပါသည်။",
      c3Title: "သေတ္တာကြီးထဲ ပြန်လည်ထုပ်ပိုးခြင်း",
      c3Desc: "ပါဆယ်များကို ပျက်စီးထိခိုက်မှုမရှိစေရန် သေတ္တာကြီးများထဲတွင် စနစ်တကျ လုံခြုံစွာ စုစည်းထုပ်ပိုးပြီးမှ ပို့ဆောင်ပေးပါသည်။"
    },
    journey: {
      heading: "လုပ်ငန်းစဉ် ၄ ဆင့်",
      subheading: "ကျွန်ုပ်တို့ဂိုဒေါင်မှ သင့်လက်ထဲသို့ ရိုးရှင်းပြီး ပွင့်လင်းမြင်သာသော အဆင့်လေးဆင့်။",
      step1Title: "ပါဆယ်ရောက်ရှိ",
      step1Desc: "သင့်ပါဆယ် ကျွန်ုပ်တို့၏ ကုန်လက်ခံဂိုဒေါင်သို့ လုံခြုံစွာ ရောက်ရှိပါသည်။",
      step2Title: "မှတ်တမ်းတင်ခြင်း",
      step2Desc: "ဓာတ်ပုံ၊ အလေးချိန်၊ အရွယ်အစားနှင့် ရောက်ရှိချိန်ကို တိကျစွာ မှတ်တမ်းတင်ပါသည်။",
      step3Title: "သေတ္တာကြီးထဲ ထုပ်ပိုး",
      step3Desc: "ပါဆယ်များကို မထိခိုက်စေရန် သေတ္တာကြီးထဲတွင် လုံခြုံစွာ စုစည်းထုပ်ပိုးပါသည်။",
      step4Title: "အိမ်အရောက် ပို့ဆောင်",
      step4Desc: "ကုန်တင်ကားကြီးများဖြင့် သင့်ထံသို့ ဘေးကင်းလုံခြုံစွာ ပို့ဆောင်ပေးပါသည်။"
    },
    whyUs: {
      heading: "ဖောက်သည်များ ကျွန်ုပ်တို့ကို ရွေးချယ်ရသည့်အကြောင်း",
      subheading: "ရှင်းလင်းသော မှတ်တမ်း၊ ပွင့်လင်းမြင်သာမှုနှင့် ကုန်စည်တိုင်းကို ဂရုတစိုက် ကိုင်တွယ်မှု။",
      point1: "ပါဆယ်တိုင်းအတွက် ကြည်လင်သော ဓာတ်ပုံနှင့် ဒစ်ဂျစ်တယ်မှတ်တမ်း",
      point2: "ကုန်ပစ္စည်းများ မထိခိုက်စေရန် စနစ်တကျ အထူးထုပ်ပိုးမှု",
      point3: "မြန်မာနှင့် အင်္ဂလိပ် နှစ်ဘာသာဖြင့် အဆင်ပြေစွာ ဆက်သွယ်မေးမြန်းနိုင်မှု",
      point4: "တိကျသော အလေးချိန်ချိန်တွယ်မှုနှင့် မှန်ကန်သော ပို့ဆောင်ရေးအချိန်ဇယား"
    },
    contact: {
      heading: "ကုန်စည်ပို့ဆောင်ရန် အဆင်သင့်ဖြစ်ပြီလား။",
      subheading: "ယနေ့ပင် ဆက်သွယ်လိုက်ပါ။ ကုန်စည်များ ပို့ဆောင်နိုင်ရန် ကျွန်ုပ်တို့အဖွဲ့မှ ကူညီဆောင်ရွက်ပေးပါမည်။",
      phoneLabel: "ဖုန်းခေါ်ဆိုရန်",
      phoneDisplay: "+66 064 554 4483",
      phoneHref: "tel:+660645544483",
      emailLabel: "အီးမေးလ် ပို့ရန်",
      emailDisplay: "satkyar2024@gmail.com",
      emailHref: "mailto:satkyar2024@gmail.com",
      facebookLabel: "Facebook စာမျက်နှာ",
      facebookHref: "https://www.facebook.com/profile.php?id=61562897885529",
      messengerLabel: "Facebook မက်ဆေ့ဂျာ",
      messengerHref: "https://www.facebook.com/messages/t/392106177317220",
      addressLabel: "ဂိုဒေါင် လိပ်စာ",
      addressText: "Bangkok Yai, Thailand, 10150",
      mapsHref: "https://www.google.com/maps/search/?api=1&query=Bangkok+Yai,+Thailand,+10150"
    },
    footer: {
      copyright: "© 2026 SK Cargo. မူပိုင်ခွင့်များ ရယူထားပြီးဖြစ်သည်။",
      tagline: "ပါဆယ်လက်ခံခြင်းနှင့် ကုန်စည်ပို့ဆောင်ရေးဝန်ဆောင်မှု"
    }
  }
};
