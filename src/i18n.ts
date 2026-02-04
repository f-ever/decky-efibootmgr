import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "pluginName": "EFI Boot Manager",
      "currentBoot": "Current Boot",
      "nextBoot": "Next Boot",
      "followBootOrder": "Follow BootOrder",
      "unknown": "Unknown",
      "refresh": "Refresh",
      "loading": "Loading...",
      "bootOrderTitle": "Boot Order",
      "nextBootButton": "Next Boot",
      "error": "Error",
      "retry": "Retry",
      "success": "Success",
      "bootOrderSaveFailed": "Failed to save boot order",
      "bootNextSetFailed": "Failed to set next boot",
      "parseError": "Unable to parse boot information",
      "getBootInfoFailed": "Failed to get boot information"
    }
  },
  'zh-CN': {
    translation: {
      "pluginName": "EFI 启动管理器",
      "currentBoot": "当前启动",
      "nextBoot": "下次启动",
      "followBootOrder": "跟随 BootOrder",
      "unknown": "未知",
      "refresh": "刷新",
      "loading": "加载中...",
      "bootOrderTitle": "启动项顺序",
      "nextBootButton": "下次启动",
      "error": "错误",
      "retry": "重试",
      "success": "成功",
      "bootOrderSaveFailed": "保存启动顺序失败",
      "bootNextSetFailed": "设置下次启动失败",
      "parseError": "无法解析启动信息",
      "getBootInfoFailed": "获取启动信息失败"
    }
  },
  'schinese': {
    translation: {
      "pluginName": "EFI 启动管理器",
      "currentBoot": "当前启动",
      "nextBoot": "下次启动",
      "followBootOrder": "跟随 BootOrder",
      "unknown": "未知",
      "refresh": "刷新",
      "loading": "加载中...",
      "bootOrderTitle": "启动项顺序",
      "nextBootButton": "下次启动",
      "error": "错误",
      "retry": "重试",
      "success": "成功",
      "bootOrderSaveFailed": "保存启动顺序失败",
      "bootNextSetFailed": "设置下次启动失败",
      "parseError": "无法解析启动信息",
      "getBootInfoFailed": "获取启动信息失败"
    }
  }
};

// Language mapping from Steam to i18next locale
const languageMap: Record<string, string> = {
  'english': 'en',
  'schinese': 'schinese',
  'tchinese': 'zh-CN',
  'german': 'de',
  'french': 'fr',
  'italian': 'it',
  'japanese': 'ja',
  'koreana': 'ko',
  'spanish': 'es',
  'russian': 'ru',
};

let isInitialized = false;

export async function initI18n() {
  if (isInitialized) return;
  
  try {
    // Get Steam language
    const steamLanguage = await SteamClient.Settings.GetCurrentLanguage();
    console.log('Steam Language:', steamLanguage);
    
    const locale = languageMap[steamLanguage] || 'en';
    console.log('Using locale:', locale);
    
    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: locale,
        fallbackLng: 'en',
        interpolation: {
          escapeValue: false
        }
      });
    
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize i18n:', error);
    // Fallback to English
    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
          escapeValue: false
        }
      });
    isInitialized = true;
  }
}

export default i18n;
