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
      "getBootInfoFailed": "Failed to get boot information",
      "advancedSettings": "Advanced Settings",
      "allBootEntries": "All Boot Entries",
      "alias": "Alias",
      "originalName": "Original Name",
      "bootId": "Boot ID",
      "hide": "Hide",
      "show": "Show",
      "visible": "Visible",
      "hidden": "Hidden",
      "delete": "Delete",
      "deleteConfirmTitle": "Confirm Delete",
      "deleteConfirmDesc": "Are you sure you want to delete this boot entry? This action cannot be undone.",
      "save": "Save",
      "cancel": "Cancel",
      "settingsSaved": "Settings saved",
      "settingsSaveFailed": "Failed to save settings",
      "deleteSuccess": "Boot entry deleted",
      "deleteFailed": "Failed to delete boot entry",
      "aliasPlaceholder": "Enter alias...",
      "noBootEntries": "No boot entries found",
      "active": "Active",
      "inactive": "Inactive",
      "back": "Back"
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
      "getBootInfoFailed": "获取启动信息失败",
      "advancedSettings": "高级设置",
      "allBootEntries": "所有启动项",
      "alias": "别名",
      "originalName": "原始名称",
      "bootId": "启动项 ID",
      "hide": "隐藏",
      "show": "显示",
      "visible": "可见",
      "hidden": "已隐藏",
      "delete": "删除",
      "deleteConfirmTitle": "确认删除",
      "deleteConfirmDesc": "确定要删除此启动项吗？此操作不可撤销。",
      "save": "保存",
      "cancel": "取消",
      "settingsSaved": "设置已保存",
      "settingsSaveFailed": "保存设置失败",
      "deleteSuccess": "启动项已删除",
      "deleteFailed": "删除启动项失败",
      "aliasPlaceholder": "输入别名...",
      "noBootEntries": "未找到启动项",
      "active": "已激活",
      "inactive": "未激活",
      "back": "返回"
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
      "getBootInfoFailed": "获取启动信息失败",
      "advancedSettings": "高级设置",
      "allBootEntries": "所有启动项",
      "alias": "别名",
      "originalName": "原始名称",
      "bootId": "启动项 ID",
      "hide": "隐藏",
      "show": "显示",
      "visible": "可见",
      "hidden": "已隐藏",
      "delete": "删除",
      "deleteConfirmTitle": "确认删除",
      "deleteConfirmDesc": "确定要删除此启动项吗？此操作不可撤销。",
      "save": "保存",
      "cancel": "取消",
      "settingsSaved": "设置已保存",
      "settingsSaveFailed": "保存设置失败",
      "deleteSuccess": "启动项已删除",
      "deleteFailed": "删除启动项失败",
      "aliasPlaceholder": "输入别名...",
      "noBootEntries": "未找到启动项",
      "active": "已激活",
      "inactive": "未激活",
      "back": "返回"
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
