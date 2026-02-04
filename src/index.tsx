import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses,
  Focusable
} from "@decky/ui";
import {
  callable,
  definePlugin,
  toaster
} from "@decky/api";
import { useState, useEffect } from "react";
import { FaArrowUp, FaArrowDown, FaSync, FaPowerOff } from "react-icons/fa";
import { useTranslation } from 'react-i18next';
import i18n, { initI18n } from './i18n';

// Backend API calls
const getBootInfo = callable<[], { success: boolean; data?: string; error?: string }>("get_boot_info");
const setBootOrder = callable<[order: string[]], { success: boolean; error?: string }>("set_boot_order");
const setBootNext = callable<[bootNum: string], { success: boolean; error?: string }>("set_boot_next");

// Types
interface BootEntry {
  id: string;
  number: string;
  label: string;
  isActive: boolean;
}

interface BootInfo {
  bootCurrent: string | null;
  bootNext: string | null;
  bootOrder: string[];
  entries: BootEntry[];
}

// Helper function to extract clean OS name
function extractOSName(fullLabel: string): string {
  // Remove paths and GUIDs, keep only the OS name
  let name = fullLabel.split(/[\t\r\n]/)[0].trim();
  // Remove anything after HD( or other technical details
  name = name.split(/\s+HD\(/)[0].trim();
  
  // Replace common names
  if (name.toLowerCase().includes('windows boot manager')) {
    return 'Windows';
  }
  
  return name;
}

// Parse efibootmgr output
function parseBootOutput(output: string): BootInfo | null {
  try {
    const lines = output.split('\n');
    let bootCurrent: string | null = null;
    let bootNext: string | null = null;
    let bootOrder: string[] = [];
    const entries: BootEntry[] = [];

    for (const line of lines) {
      // Parse BootCurrent
      const currentMatch = line.match(/BootCurrent:\s*(\d{4})/);
      if (currentMatch) {
        bootCurrent = currentMatch[1];
      }

      // Parse BootNext
      const nextMatch = line.match(/BootNext:\s*(\d{4})/);
      if (nextMatch) {
        bootNext = nextMatch[1];
      }

      // Parse BootOrder
      const orderMatch = line.match(/BootOrder:\s*([\d,]+)/);
      if (orderMatch) {
        bootOrder = orderMatch[1].split(',').map(s => s.trim());
      }

      // Parse Boot entries
      const entryMatch = line.match(/Boot(\d{4})(\*?)\s+(.+)/);
      if (entryMatch) {
        const number = entryMatch[1];
        const isActive = entryMatch[2] === '*';
        const fullLabel = entryMatch[3].trim();
        const label = extractOSName(fullLabel);
        entries.push({
          id: number,
          number,
          label,
          isActive
        });
      }
    }

    return { bootCurrent, bootNext, bootOrder, entries };
  } catch (e) {
    console.error("Failed to parse boot output:", e);
    return null;
  }
}


// Sortable boot entry item component
interface BootEntryItemProps {
  entry: BootEntry;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetBootNext: () => void;
  disabled: boolean;
}

function BootEntryItem({ entry, index, total, onMoveUp, onMoveDown, onSetBootNext, disabled }: BootEntryItemProps) {
  const { t } = useTranslation();
  const style = {
    marginBottom: "4px",
    padding: "4px 8px",
    backgroundColor: entry.isActive ? "rgba(255, 215, 0, 0.15)" : "transparent",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minHeight: "32px"
  };

  return (
    <div style={style}>
      <Focusable style={{ display: "flex", alignItems: "center", gap: "2px" }}>
        <button
          onClick={(e: any) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={disabled || index === 0}
          style={{ 
            background: "none", 
            border: "1px solid rgba(255,255,255,0.2)", 
            padding: "4px 6px",
            cursor: disabled || index === 0 ? "not-allowed" : "pointer",
            opacity: disabled || index === 0 ? 0.3 : 1,
            borderRadius: "3px",
            color: "inherit",
            fontSize: "12px"
          }}
        >
          <FaArrowUp />
        </button>
        <button
          onClick={(e: any) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={disabled || index === total - 1}
          style={{ 
            background: "none", 
            border: "1px solid rgba(255,255,255,0.2)", 
            padding: "4px 6px",
            cursor: disabled || index === total - 1 ? "not-allowed" : "pointer",
            opacity: disabled || index === total - 1 ? 0.3 : 1,
            borderRadius: "3px",
            color: "inherit",
            fontSize: "12px"
          }}
        >
          <FaArrowDown />
        </button>
      </Focusable>
      
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "14px" }}>
          {entry.label}
        </span>
      </div>
      
      <button
        onClick={(e: any) => {
          e.stopPropagation();
          onSetBootNext();
        }}
        disabled={disabled}
        style={{ 
          background: "none", 
          border: "1px solid rgba(255,255,255,0.3)", 
          padding: "4px 8px",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.3 : 1,
          borderRadius: "3px",
          color: "inherit",
          fontSize: "12px",
          whiteSpace: "nowrap"
        }}
      >
        {t('nextBootButton')}
      </button>
    </div>
  );
}

function Content() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootInfo, setBootInfo] = useState<BootInfo | null>(null);
  const [orderedEntries, setOrderedEntries] = useState<BootEntry[]>([]);

  const loadBootInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBootInfo();
      if (result.success && result.data) {
        const parsed = parseBootOutput(result.data);
        if (parsed) {
          setBootInfo(parsed);
          // Filter to only show SteamOS and Windows
          const filteredEntries = parsed.entries.filter(e => {
            const label = e.label.toLowerCase();
            return label.includes('steamos') || label.includes('windows');
          });
          // Order entries according to BootOrder
          const ordered = parsed.bootOrder
            .map(num => filteredEntries.find(e => e.number === num))
            .filter((e): e is BootEntry => e !== undefined);
          // Add any filtered entries not in BootOrder at the end
          const remaining = filteredEntries.filter(e => !parsed.bootOrder.includes(e.number));
          setOrderedEntries([...ordered, ...remaining]);
        } else {
          setError(t('parseError'));
        }
      } else {
        setError(result.error || t('getBootInfoFailed'));
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

  const saveBootOrder = async (entries: BootEntry[]) => {
    const order = entries.map(e => e.number);
    const result = await setBootOrder(order);
    
    if (result.success) {
      await loadBootInfo();
    } else {
      toaster.toast({
        title: t('error'),
        body: result.error || t('bootOrderSaveFailed')
      });
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
      toaster.toast({
        title: t('error'),
        body: result.error || t('bootNextSetFailed')
      });
    }
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

  // Helper function to get entry name by boot number
  const getEntryName = (bootNum: string | null): string => {
    if (!bootNum) return t('unknown');
    const entry = bootInfo?.entries.find(e => e.number === bootNum);
    return entry ? entry.label : `Boot${bootNum}`;
  };

  return (
    <>
      <PanelSection title={t('pluginName')}>
        <PanelSectionRow>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px" }}>
            <div>
              <strong>{t('currentBoot')}:</strong> {getEntryName(bootInfo?.bootCurrent || null)}
            </div>
            <div>
              <strong>{t('nextBoot')}:</strong> {bootInfo?.bootNext ? getEntryName(bootInfo.bootNext) : t('followBootOrder')}
            </div>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={loadBootInfo}
            disabled={loading}
          >
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
    </>
  );
}

export default definePlugin(() => {
  // Initialize i18n before returning
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
