/**
 * Multi-lingual internationalization (i18n) for MeshAid
 * Offline translations for English, Hindi, Spanish, Bengali, and Telugu.
 */

export type LanguageCode = 'en' | 'hi' | 'es' | 'bn' | 'te';

export interface LanguageInfo {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
];

const LANG_STORAGE_KEY = 'meshaid_lang_v1';

export function getSavedLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY) as LanguageCode;
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
  } catch {}
  return 'en';
}

export function saveLanguage(lang: LanguageCode): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
}

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    // Navigation
    chats: 'Chats',
    map: 'Map',
    incidents: 'Incidents',
    settings: 'Settings',

    // SOS & Alerts
    trigger_sos: 'Trigger SOS',
    critical_sos_received: 'CRITICAL SOS RECEIVED!',
    sos_broadcast_desc: 'Immediate assistance requested via mesh network',
    view_on_map: 'View on Map',
    mute_alarm: 'Mute Siren',
    cancel_sos: 'Cancel SOS Beacon',
    active_sos_banner: 'ACTIVE SOS BEACON BROADCASTING',
    priority: 'Priority',
    category: 'Category',
    coordinates: 'Coordinates',
    sender: 'Sender',

    // SOS Categories
    cat_medical: 'Medical',
    cat_fire: 'Fire',
    cat_flood: 'Flood',
    cat_trapped: 'Trapped',
    cat_supplies: 'Supplies',
    cat_security: 'Security',

    // Map
    offline_map_manager: 'Offline Area',
    download_area_title: 'Download Offline Area',
    download_area_desc: 'Save map tiles for current location so the map works 100% without internet.',
    download_now: 'Download Now',
    downloading_tiles: 'Downloading map tiles...',
    tiles_saved: 'Offline tiles saved successfully!',
    clear_cache: 'Clear Cached Tiles',
    recenter: 'Recenter',
    legend: 'Legend',
    filter_all: 'All',
    filter_sos: 'SOS Only',
    filter_online: 'Online Only',
    you: 'You (Local Node)',
    radio_range: 'Radio range (~100m)',

    // Chat
    broadcast_channel: 'Public Emergency Broadcast',
    type_message_placeholder: 'Type emergency message...',
    voice_input: 'Voice Input',
    send: 'Send',
    encrypted_badge: 'Encrypted (AES-256)',
    out_of_range: 'Node out of radio range',
    emergency_detected: 'Emergency keyword detected:',

    // Settings
    settings_title: 'MeshAid Configuration',
    language_select: 'Application Language',
    encryption_key_title: 'Mesh Encryption Key',
    encryption_key_desc: 'All messages are encrypted with AES-GCM 256. Responders in your group must share this key.',
    theme: 'Display Theme',
    dark: 'Dark Mode',
    light: 'Light Mode',
    system: 'System Default',
    device_id: 'Your Node ID',
    role: 'Assigned Role',
    role_civilian: 'Civilian',
    role_responder: 'First Responder',
    reset_data: 'Reset Application Data',
  },
  hi: {
    // Navigation
    chats: 'चैट्स',
    map: 'नक्शा',
    incidents: 'घटनाएँ',
    settings: 'सेटिंग्स',

    // SOS & Alerts
    trigger_sos: 'एसओएस भेजें (SOS)',
    critical_sos_received: 'गंभीर आपातकालीन सूचना (SOS)!',
    sos_broadcast_desc: 'मेश नेटवर्क के माध्यम से तत्काल सहायता का अनुरोध',
    view_on_map: 'नक्शे पर देखें',
    mute_alarm: 'सायरन बंद करें',
    cancel_sos: 'एसओएस रद्द करें',
    active_sos_banner: 'सक्रिय आपातकालीन प्रसारण चालू है',
    priority: 'प्राथमिकता',
    category: 'श्रेणी',
    coordinates: 'स्थान निर्देशांक',
    sender: 'भेजने वाला',

    // SOS Categories
    cat_medical: 'चिकित्सा सहायता',
    cat_fire: 'आग',
    cat_flood: 'बाढ़',
    cat_trapped: 'फंसे हुए',
    cat_supplies: 'राशन / आपूर्ति',
    cat_security: 'सुरक्षा',

    // Map
    offline_map_manager: 'ऑफलाइन क्षेत्र',
    download_area_title: 'ऑफलाइन नक्शा डाउनलोड करें',
    download_area_desc: 'वर्तमान क्षेत्र के नक्शे को सुरक्षित करें ताकि इंटरनेट के बिना भी काम करे।',
    download_now: 'डाउनलोड करें',
    downloading_tiles: 'नक्शा डाउनलोड हो रहा है...',
    tiles_saved: 'ऑफलाइन नक्शा सफलतापूर्वक सुरक्षित हुआ!',
    clear_cache: 'कैश साफ करें',
    recenter: 'मेरे स्थान पर जाएं',
    legend: 'संकेत सूची',
    filter_all: 'सभी',
    filter_sos: 'केवल SOS',
    filter_online: 'केवल ऑनलाइन',
    you: 'आप (स्थानीय नोड)',
    radio_range: 'रेडियो दायरा (~100 मी)',

    // Chat
    broadcast_channel: 'सार्वजनिक आपातकालीन चैनल',
    type_message_placeholder: 'संदेश टाइप करें...',
    voice_input: 'आवाज़ इनपुट',
    send: 'भेजें',
    encrypted_badge: 'सुरक्षित एन्क्रिप्टेड (AES-256)',
    out_of_range: 'नोड रेंज से बाहर है',
    emergency_detected: 'आपातकालीन शब्द पहचाना गया:',

    // Settings
    settings_title: 'कॉन्फ़िगरेशन',
    language_select: 'भाषा चुनें',
    encryption_key_title: 'मेश एन्क्रिप्शन कुंजी',
    encryption_key_desc: 'सभी संदेश AES-GCM 256 द्वारा सुरक्षित हैं। आपके दल के सभी सदस्यों की कुंजी समान होनी चाहिए।',
    theme: 'थीम',
    dark: 'डार्क मोड',
    light: 'लाइट मोड',
    system: 'सिस्टम डिफॉल्ट',
    device_id: 'आपका नोड आईडी',
    role: 'भूमिका',
    role_civilian: 'नागरिक',
    role_responder: 'राहत दल (रेस्पॉन्डर)',
    reset_data: 'डेटा रीसेट करें',
  },
  es: {
    // Navigation
    chats: 'Mensajes',
    map: 'Mapa',
    incidents: 'Incidentes',
    settings: 'Ajustes',

    // SOS & Alerts
    trigger_sos: 'Activar SOS',
    critical_sos_received: '¡SOS CRÍTICO RECIBIDO!',
    sos_broadcast_desc: 'Asistencia inmediata solicitada a través de la red mesh',
    view_on_map: 'Ver en el Mapa',
    mute_alarm: 'Silenciar Sirena',
    cancel_sos: 'Cancelar Baliza SOS',
    active_sos_banner: 'BALIZA SOS ACTIVA TRANSMITIENDO',
    priority: 'Prioridad',
    category: 'Categoría',
    coordinates: 'Coordenadas',
    sender: 'Remitente',

    // SOS Categories
    cat_medical: 'Médico',
    cat_fire: 'Incendio',
    cat_flood: 'Inundación',
    cat_trapped: 'Atrapado',
    cat_supplies: 'Suministros',
    cat_security: 'Seguridad',

    // Map
    offline_map_manager: 'Zona Sin Conexión',
    download_area_title: 'Descargar Mapa Fuera de Línea',
    download_area_desc: 'Guarda mosaicos del área actual para operar 100% sin internet.',
    download_now: 'Descargar Ahora',
    downloading_tiles: 'Descargando mosaicos...',
    tiles_saved: '¡Mosaicos fuera de línea guardados con éxito!',
    clear_cache: 'Limpiar Caché',
    recenter: 'Recentrar',
    legend: 'Leyenda',
    filter_all: 'Todos',
    filter_sos: 'Solo SOS',
    filter_online: 'Solo En Línea',
    you: 'Tú (Nodo Local)',
    radio_range: 'Rango de radio (~100m)',

    // Chat
    broadcast_channel: 'Transmisión Pública de Emergencia',
    type_message_placeholder: 'Escribe un mensaje de emergencia...',
    voice_input: 'Entrada de Voz',
    send: 'Enviar',
    encrypted_badge: 'Cifrado (AES-256)',
    out_of_range: 'Nodo fuera de alcance de radio',
    emergency_detected: 'Palabra clave de emergencia detectada:',

    // Settings
    settings_title: 'Configuración de MeshAid',
    language_select: 'Idioma de la Aplicación',
    encryption_key_title: 'Clave de Cifrado Mesh',
    encryption_key_desc: 'Todos los mensajes están cifrados con AES-GCM 256.',
    theme: 'Tema de Visualización',
    dark: 'Modo Oscuro',
    light: 'Modo Claro',
    system: 'Predeterminado del Sistema',
    device_id: 'ID de tu Nodo',
    role: 'Rol Asignado',
    role_civilian: 'Civil',
    role_responder: 'Socorrista',
    reset_data: 'Restablecer Datos',
  },
  bn: {
    // Navigation
    chats: 'চ্যাট',
    map: 'মানচিত্র',
    incidents: 'দুর্ঘটনা',
    settings: 'সেটিংস',

    // SOS & Alerts
    trigger_sos: 'জরুরি SOS পাঠান',
    critical_sos_received: 'জরুরি বিপদ সংকেত (SOS) প্রাপ্ত!',
    sos_broadcast_desc: 'মেশ নেটওয়ার্কের মাধ্যমে দ্রুত সহায়তা চাওয়া হয়েছে',
    view_on_map: 'মানচিত্রে দেখুন',
    mute_alarm: 'সাইরেন বন্ধ করুন',
    cancel_sos: 'SOS বাতিল করুন',
    active_sos_banner: 'সক্রিয় জরুরি সংকেত প্রচারিত হচ্ছে',
    priority: 'অগ্রাধিকার',
    category: 'বিভাগ',
    coordinates: 'অবস্থান স্থানাঙ্ক',
    sender: 'প্রেরক',

    // SOS Categories
    cat_medical: 'চিকিৎসা',
    cat_fire: 'আগুন',
    cat_flood: 'বন্যা',
    cat_trapped: 'আটকে পড়া',
    cat_supplies: 'ত্রাণ / রসদ',
    cat_security: 'নিরাপত্তা',

    // Map
    offline_map_manager: 'অফলাইন এলাকা',
    download_area_title: 'অফলাইন মানচিত্র ডাউনলোড করুন',
    download_area_desc: 'ইন্টারনেট ছাড়াই মানচিত্র ব্যবহার করতে এই এলাকা সংরক্ষণ করুন।',
    download_now: 'ডাউনলোড করুন',
    downloading_tiles: 'মানচিত্র ডাউনলোড হচ্ছে...',
    tiles_saved: 'অফলাইন মানচিত্র সফলভাবে সংরক্ষিত!',
    clear_cache: 'ক্যাশে সাফ করুন',
    recenter: 'আমার অবস্থান',
    legend: 'নির্দেশিকা',
    filter_all: 'সব',
    filter_sos: 'শুধু SOS',
    filter_online: 'শুধু অনলাইন',
    you: 'আপনি (স্থানীয় নোড)',
    radio_range: 'রেডিও সীমা (~১০০ মি)',

    // Chat
    broadcast_channel: 'পাবলিক জরুরি চ্যানেল',
    type_message_placeholder: 'বার্তা লিখুন...',
    voice_input: 'ভয়েস ইনপুট',
    send: 'পাঠান',
    encrypted_badge: 'নিরাপদ এনক্রিপ্ট করা (AES-256)',
    out_of_range: 'সীমার বাইরে',
    emergency_detected: 'জরুরি শব্দ সনাক্ত করা হয়েছে:',

    // Settings
    settings_title: 'কনফিগারেশন',
    language_select: 'ভাষা নির্বাচন করুন',
    encryption_key_title: 'মেশ এনক্রিপশন চাবি',
    encryption_key_desc: 'সমস্ত বার্তা AES-GCM 256 দিয়ে সুরক্ষিত।',
    theme: 'থিম',
    dark: 'ডার্ক মোড',
    light: 'লাইট মোড',
    system: 'সিস্টেম ডিফল্ট',
    device_id: 'আপনার নোড আইডি',
    role: 'ভূমিকা',
    role_civilian: 'নাগরিক',
    role_responder: 'উদ্ধারকারী',
    reset_data: 'তথ্য রিসেট করুন',
  },
  te: {
    // Navigation
    chats: 'చాట్స్',
    map: 'మ్యాప్',
    incidents: 'సంఘటనలు',
    settings: 'సెట్టింగ్‌లు',

    // SOS & Alerts
    trigger_sos: 'SOS పంపండి',
    critical_sos_received: 'తీవ్ర అత్యవసర హెచ్చరిక (SOS)!',
    sos_broadcast_desc: 'మెష్ నెట్‌వర్క్ ద్వారా అత్యవసర సహాయం అభ్యర్థించబడింది',
    view_on_map: 'మ్యాప్‌లో చూడండి',
    mute_alarm: 'సైరన్ ఆపండి',
    cancel_sos: 'SOS రద్దు చేయండి',
    active_sos_banner: 'సక్రియ SOS ప్రసారం అవుతోంది',
    priority: 'ప్రాధాన్యత',
    category: 'వర్గం',
    coordinates: 'కోఆర్డినేట్లు',
    sender: 'పంపినవారు',

    // SOS Categories
    cat_medical: 'వైద్య సహాయం',
    cat_fire: 'అగ్ని ప్రమాదం',
    cat_flood: 'వరదలు',
    cat_trapped: 'చిక్కుకుపోయారు',
    cat_supplies: 'సామగ్రి / ఆహారం',
    cat_security: 'భద్రత',

    // Map
    offline_map_manager: 'ఆఫ్‌లైన్ ప్రాంతం',
    download_area_title: 'ఆఫ్‌లైన్ మ్యాప్‌ను డౌన్‌లోడ్ చేయండి',
    download_area_desc: 'ఇంటర్నెట్ లేకుండా ఉపయోగించడానికి ప్రస్తుత మ్యాప్ టైల్స్‌ను నిల్వ చేయండి.',
    download_now: 'ఇప్పుడే డౌన్‌లోడ్ చేయండి',
    downloading_tiles: 'మ్యాప్ టైల్స్ డౌన్‌లోడ్ అవుతున్నాయి...',
    tiles_saved: 'ఆఫ్‌లైన్ మ్యాప్ విజయవంతంగా భద్రపరచబడింది!',
    clear_cache: 'కాష్ క్లియర్ చేయండి',
    recenter: 'రీసెంటర్',
    legend: 'లెజెండ్',
    filter_all: 'అన్నీ',
    filter_sos: 'SOS మాత్రమే',
    filter_online: 'ఆన్‌లైన్ మాత్రమే',
    you: 'మీరు (స్థానిక నోడ్)',
    radio_range: 'రేడియో పరిధి (~100 మీ)',

    // Chat
    broadcast_channel: 'ప్రజా అత్యవసర ఛానెల్',
    type_message_placeholder: 'సందేశాన్ని టైప్ చేయండి...',
    voice_input: 'వాయిస్ ఇన్‌పుట్',
    send: 'పంపు',
    encrypted_badge: 'ఎన్‌క్రిప్ట్ చేయబడింది (AES-256)',
    out_of_range: 'పరిధి దాటింది',
    emergency_detected: 'అత్యవసర పదం కనుగొనబడింది:',

    // Settings
    settings_title: 'కాన్ఫిగరేషన్',
    language_select: 'భాషను ఎంచుకోండి',
    encryption_key_title: 'మెష్ ఎన్‌క్రిప్షన్ కీ',
    encryption_key_desc: 'సందేశాలు అన్నీ AES-GCM 256 తో సురక్షితంగా ఉంటాయి.',
    theme: 'థీమ్',
    dark: 'డార్క్ మోడ్',
    light: 'లైట్ మోడ్',
    system: 'సిస్టమ్ డిఫాల్ట్',
    device_id: 'మీ నోడ్ ID',
    role: 'పాత్ర',
    role_civilian: 'పౌరుడు',
    role_responder: 'సహాయక సిబ్బంది',
    reset_data: 'డేటాను రీసెట్ చేయండి',
  },
};

export function translate(lang: LanguageCode, key: string, fallback?: string): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || fallback || key;
}
