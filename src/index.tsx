import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses,
  Focusable,
  DialogButton,
} from "@decky/ui";
import {
  callable,
  definePlugin,
  toaster
} from "@decky/api";
import { useState, useEffect } from "react";
import { FaArrowUp, FaArrowDown, FaSync, FaPowerOff, FaCog } from "react-icons/fa";
import { useTranslation } from 'react-i18next';
import i18n, { initI18n } from './i18n';
import AdvancedSettingsPanel from './advancedSettings';
import { type BootEntry, type BootInfo, parseBootOutput, getDisplayName } from './utils';

// Backend API calls
const getBootInfo = callable<[], { success: boolean; data?: string; error?: string }>("get_boot_info");
const setBootOrder = callable<[order: string[]], { success: boolean; error?: string }>("set_boot_order");
const setBootNext = callable<[bootNum: string], { success: boolean; error?: string }>("set_boot_next");
const getSettings = callable<[], { success: boolean; data?: { aliases: Record<string, string>; hidden: string[] }; error?: string }>("get_settings");

// Boot entry item for main view
interface BootEntryItemProps {
  entry: BootEntry;
  displayLabel: string;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetBootNext: () => void;
  disabled: boolean;
}

function BootEntryItem({ entry, displayLabel, index, total, onMoveUp, onMoveDown, onSetBootNext, disabled }: BootEntryItemProps) {
  const { t } = useTranslation();

  return (
    <Focusable
      style={{
        marginBottom: "4px",
        padding: "4px 8px",
        backgroundColor: entry.isActive ? "rgba(255, 215, 0, 0.15)" : "transparent",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        minHeight: "32px",
      }}
    >
      <DialogButton
        onClick={onMoveUp}
        disabled={disabled || index === 0}
        style={{
          minWidth: "unset",
          width: "28px",
          height: "28px",
          padding: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <FaArrowUp style={{ fontSize: "12px" }} />
      </DialogButton>
      <DialogButton
        onClick={onMoveDown}
        disabled={disabled || index === total - 1}
        style={{
          minWidth: "unset",
          width: "28px",
          height: "28px",
          padding: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <FaArrowDown style={{ fontSize: "12px" }} />
      </DialogButton>

      <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
        <span style={{ fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{displayLabel}</span>
      </div>

      <DialogButton
        onClick={onSetBootNext}
        disabled={disabled}
        style={{
          minWidth: "unset",
          width: "auto",
          padding: "4px 8px",
          fontSize: "12px",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {t('nextBootButton')}
      </DialogButton>
    </Focusable>
  );
}

function Content() {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootInfo, setBootInfo] = useState<BootInfo | null>(null);
  const [orderedEntries, setOrderedEntries] = useState<BootEntry[]>([]);
  const [aliases, setAliases] = useState<Record<string, string>>({});

  const loadBootInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bootResult, settingsResult] = await Promise.all([getBootInfo(), getSettings()]);

      let currentAliases: Record<string, string> = {};
      let currentHidden: string[] = [];
      if (settingsResult.success && settingsResult.data) {
        currentAliases = settingsResult.data.aliases || {};
        currentHidden = settingsResult.data.hidden || [];
        setAliases(currentAliases);
      }

      if (bootResult.success && bootResult.data) {
        const parsed = parseBootOutput(bootResult.data);
        if (parsed) {
          setBootInfo(parsed);
          // Exclude hidden entries
          const filteredEntries = parsed.entries.filter(e => {
            return !currentHidden.includes(e.number);
          });
          // Order by BootOrder
          const ordered = parsed.bootOrder
            .map(num => filteredEntries.find(e => e.number === num))
            .filter((e): e is BootEntry => e !== undefined);
          const remaining = filteredEntries.filter(e => !parsed.bootOrder.includes(e.number));
          setOrderedEntries([...ordered, ...remaining]);
        } else {
          setError(t('parseError'));
        }
      } else {
        setError(bootResult.error || t('getBootInfoFailed'));
      }
    } catch (e) {
      setError(`${t('error')}: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBootInfo();
  }, []);

  // Show settings panel (tab switch)
  if (showSettings) {
    return (
      <AdvancedSettingsPanel
        onBack={() => {
          setShowSettings(false);
          loadBootInfo(); // reload data with new settings
        }}
      />
    );
  }

  const saveBootOrder = async (entries: BootEntry[]) => {
    const order = entries.map(e => e.number);
    const result = await setBootOrder(order);
    if (result.success) {
      await loadBootInfo();
    } else {
      toaster.toast({ title: t('error'), body: result.error || t('bootOrderSaveFailed') });
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...orderedEntries];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrderedEntries(newOrder);
    await saveBootOrder(newOrder);
  };

  const handleMoveDown = async (index: number) => {
    if (index === orderedEntries.length - 1) return;
    const newOrder = [...orderedEntries];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrderedEntries(newOrder);
    await saveBootOrder(newOrder);
  };

  const handleSetBootNext = async (bootNum: string) => {
    const result = await setBootNext(bootNum);
    if (result.success) {
      await loadBootInfo();
    } else {
      toaster.toast({ title: t('error'), body: result.error || t('bootNextSetFailed') });
    }
  };

  // Get display name: alias > friendly name
  const getEntryDisplayName = (bootNum: string | null): string => {
    if (!bootNum) return t('unknown');
    if (aliases[bootNum]) return aliases[bootNum];
    const entry = bootInfo?.entries.find(e => e.number === bootNum);
    return entry ? getDisplayName(entry.label) : `Boot${bootNum}`;
  };

  if (error) {
    return (
      <PanelSection title={t('pluginName')}>
        <PanelSectionRow>
          <div style={{ color: "#ff4444", padding: "12px" }}>
            <div style={{ fontWeight: "bold", marginBottom: "8px" }}>{t('error')}</div>
            <div>{error}</div>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={loadBootInfo} disabled={loading}>
            {t('retry')}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  return (
    <>
      <PanelSection title={t('pluginName')}>
        <PanelSectionRow>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px" }}>
            <div>
              <strong>{t('currentBoot')}:</strong> {getEntryDisplayName(bootInfo?.bootCurrent || null)}
            </div>
            <div>
              <strong>{t('nextBoot')}:</strong> {bootInfo?.bootNext ? getEntryDisplayName(bootInfo.bootNext) : t('followBootOrder')}
            </div>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={loadBootInfo} disabled={loading}>
            <FaSync style={{ marginRight: "8px" }} />
            {loading ? t('loading') : t('refresh')}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      {orderedEntries.length > 0 && (
        <PanelSection title={t('bootOrderTitle')}>
          <div style={{ padding: "8px 0" }}>
            {orderedEntries.map((entry, index) => (
              <BootEntryItem
                key={entry.id}
                entry={entry}
                displayLabel={aliases[entry.number] || getDisplayName(entry.label)}
                index={index}
                total={orderedEntries.length}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                onSetBootNext={() => handleSetBootNext(entry.number)}
                disabled={loading}
              />
            ))}
          </div>
        </PanelSection>
      )}

      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => setShowSettings(true)}>
            <FaCog style={{ marginRight: "8px" }} />
            {t('advancedSettings')}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
}

export default definePlugin(() => {
  initI18n();

  return {
    name: i18n.t('pluginName'),
    titleView: <div className={staticClasses.Title}>{i18n.t('pluginName')}</div>,
    content: <Content />,
    icon: <FaPowerOff />,
    onDismount() {
      console.log("EFI Boot Manager unloading");
    },
  };
});
