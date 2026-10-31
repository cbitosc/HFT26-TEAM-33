import { SosCategory, SosPriority } from './types';

interface CategoryKeywordDef {
  category: SosCategory;
  defaultPriority: SosPriority;
  keywords: string[];
}

const KEYWORD_DATABASE: CategoryKeywordDef[] = [
  {
    category: 'Medical',
    defaultPriority: 'Critical',
    keywords: [
      // English
      'doctor', 'ambulance', 'bleed', 'bleeding', 'blood', 'injury', 'injured', 'heart attack',
      'pulse', 'medicine', 'medic', 'wound', 'unconscious', 'first aid', 'fracture', 'cpr',
      'hospital', 'sick', 'vomit', 'choking', 'burns', 'pain', 'breathing', 'asthma',
      // Hindi (Devanagari & Romanized)
      'डॉक्टर', 'अस्पताल', 'चोट', 'खून', 'दवा', 'दवाई', 'बीमार', 'दर्द', 'इलाज', 'घायल', 'बेहोश',
      'aspatal', 'khoon', 'chot', 'dawa', 'beemar', 'ghayal', 'dard',
      // Telugu (Telugu script & Romanized)
      'డాక్టర్', 'వైద్యం', 'రక్తం', 'గాయం', 'మందులు', 'ఆసుపత్రి', 'నొప్పి', 'అనారోగ్యం', 'స్పృహతప్పిన',
      'asupatri', 'raktam', 'gayam', 'mandulu', 'noppi', 'vaidyam',
      // Urdu (Urdu script & Romanized)
      'ڈاکٹر', 'ہسپتال', 'خون', 'چوٹ', 'دوا', 'بیمار', 'زخمی', 'درد', 'بے ہوش', 'طبیب',
      'haspatal', 'zakhmi', 'ilaj',
    ],
  },
  {
    category: 'Fire',
    defaultPriority: 'Critical',
    keywords: [
      // English
      'fire', 'flame', 'smoke', 'burning', 'burn', 'explosion', 'extinguisher', 'blaze', 'gas leak',
      // Hindi
      'आग', 'धुआं', 'धुआ', 'जलना', 'विस्फोट', 'सिलेंडर', 'aag', 'dhuan', 'jalna', 'visphot',
      // Telugu
      'మంటలు', 'నిప్పు', 'పొగ', 'కాలిపోవడం', 'పేలుడు', 'mantalu', 'nippu', 'poga',
      // Urdu
      'آگ', 'دھواں', 'جلنا', 'شعلہ', 'دھماکہ', 'shola', 'dhamaka',
    ],
  },
  {
    category: 'Flood',
    defaultPriority: 'High',
    keywords: [
      // English
      'flood', 'water level', 'drowning', 'submerged', 'river overflow', 'tsunami', 'rainwater', 'high water',
      // Hindi
      'बाढ़', 'पानी', 'डूब', 'सैलाब', 'जलभराव', 'baadh', 'paani', 'doob', 'sailaab',
      // Telugu
      'వరద', 'నీరు', 'మునిగిపోవడం', 'ప్రవాహం', 'varada', 'neeru', 'munigipovadam',
      // Urdu
      'سیلاب', 'پانی', 'ڈوبنا', 'طغیانی', 'sailab',
    ],
  },
  {
    category: 'Trapped',
    defaultPriority: 'Critical',
    keywords: [
      // English
      'trapped', 'stuck', 'debris', 'collapsed', 'rubble', 'cannot get out', 'caved in', 'buried', 'lift stuck',
      // Hindi
      'फंसा', 'फंसे', 'मलबे', 'गिरा', 'दबा', 'अंदर फंसा', 'fansa', 'fanse', 'malbe',
      // Telugu
      'చిక్కుకున్నాము', 'కూలిపోయింది', 'శిథిలాలు', 'బయటకు రాలేకపోతున్నాం', 'chikkukunnamu',
      // Urdu
      'پھنسا', 'ملبہ', 'دبا ہوا', 'گرنا', 'phansa', 'malba',
    ],
  },
  {
    category: 'Supplies',
    defaultPriority: 'Normal',
    keywords: [
      // English
      'food', 'water', 'drinking water', 'ration', 'supplies', 'blanket', 'starving', 'shelter', 'battery', 'flashlight', 'milk', 'baby food',
      // Hindi
      'खाना', 'राशन', 'पीने का पानी', 'कंबल', 'भोजन', 'बैटरी', 'khana', 'ration', 'kambal', 'paani',
      // Telugu
      'ఆహారం', 'తాగునీరు', 'సామగ్రి', 'దుప్పటి', 'తిండి', 'aahaaram', 'taaguneeru', 'saamagri',
      // Urdu
      'کھانا', 'راشن', 'پینے کا پانی', 'سامان', 'کمبل', 'خوراک', 'khorak',
    ],
  },
  {
    category: 'Security',
    defaultPriority: 'High',
    keywords: [
      // English
      'theft', 'robbery', 'threat', 'attack', 'looting', 'violence', 'danger', 'intruder', 'trespasser', 'weapon',
      // Hindi
      'हमला', 'खतरा', 'लूट', 'चोरी', 'हिंसा', 'हथियार', 'hamla', 'khatra', 'loot', 'chori',
      // Telugu
      'దాడి', 'ప్రమాదం', 'దొంగతనం', 'హింస', 'ఆయుధం', 'daadi', 'pramaadam', 'dongatanam',
      // Urdu
      'حملہ', 'خطرہ', 'لوٹ', 'چوری', 'تشدد', 'ہتھیار', 'tashaddud',
    ],
  },
];

export interface ClassifiedResult {
  category: SosCategory;
  priority: SosPriority;
  matchedKeyword: string;
}

export function classifyEmergencyText(inputText: string): ClassifiedResult | null {
  if (!inputText || inputText.trim().length < 3) return null;

  const normalized = inputText.toLowerCase();

  for (const item of KEYWORD_DATABASE) {
    for (const kw of item.keywords) {
      const lowerKw = kw.toLowerCase();
      // Match word boundaries for Latin scripts or substring for non-Latin scripts
      if (lowerKw.length >= 3) {
        if (normalized.includes(lowerKw)) {
          return {
            category: item.category,
            priority: item.defaultPriority,
            matchedKeyword: kw,
          };
        }
      }
    }
  }

  return null;
}
