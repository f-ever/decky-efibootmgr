import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  TextField,
  Focusable,
  DialogButton,
  ConfirmModal,
  showModal,
} from "@decky/ui";
import {
  callable,
  toaster,
} from "@decky/api";
import { useState, useEffect, useCallback, useRef, FC } from "react";
import { FaTrash, FaSync, FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { type BootEntry, parseBootOutput } from "./utils";

// Backend API calls
const getBootInfo = callable<[], { success: boolean; data?: string; error?: string }>("get_boot_info");
const getSettings = callable<[], { success: boolean; data?: { aliases: Record<string, string>; hidden: string[] }; error?: string }>("get_settings");
const saveSettings = callable<[aliases: Record<string, string>, hidden: string[]], { success: boolean; error?: string }>("save_settings");
const deleteBootEntry = callable<[bootNum: string], { success: boolean; error?: string }>("delete_boot_entry");

// Single entry row
interface EntryRowProps {
  entry: BootEntry;
  alias: string;
  isHidden: boolean;
  onAliasChange: (alias: string) => void;
  onToggleHidden: () => void;
  onDelete: () => void;
  disabled: boolean;
}

const EntryRow: FC<EntryRowProps> = ({ entry, alias, isHidden, onAliasChange, onToggleHidden, onDelete, disabled }) => {
  const { t } = useTranslation();

  const handleDelete = () => {
    showModal(
      <ConfirmModal
        strTitle={t("deleteConfirmTitle")}
        strDescription={`${t("deleteConfirmDesc")}\n\nBoot${entry.number} - ${entry.label}`}
        strOKButtonText={t("delete")}
        strCancelButtonText={t("cancel")}
        bDestructiveWarning={true}
        onOK={() => onDelete()}
      />
    );
  };

  return (
    <div
      style={{
        marginBottom: "8px",
        padding: "8px",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: "4px",
        borderLeft: entry.isActive ? "3px solid rgba(255, 215, 0, 0.6)" : "3px solid transparent",
        opacity: isHidden ? 0.5 : 1,
      }}
    >
      {/* Header: Boot ID + Original Name + Status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "11px",
              fontFamily: "monospace",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              padding: "1px 4px",
              borderRadius: "3px",
            }}
          >
            {entry.number}
          </span>
          <span style={{ fontSize: "13px", fontWeight: "bold" }}>{entry.label}</span>
        </div>
        <span
          style={{
            fontSize: "10px",
            color: entry.isActive ? "rgba(255, 215, 0, 0.8)" : "rgba(255, 255, 255, 0.4)",
          }}
        >
          {entry.isActive ? t("active") : t("inactive")}
        </span>
      </div>

      {/* EFI file path */}
      {entry.efiPath && (
        <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", marginBottom: "6px", fontFamily: "monospace" }}>
          {entry.efiPath}
        </div>
      )}

      {/* Alias input */}
      <div style={{ marginBottom: "4px" }}>
        <TextField
          label={t("alias")}
          value={alias}
          bShowClearAction
          onChange={(e) => onAliasChange((e.target as HTMLInputElement).value)}
          disabled={disabled}
        />
      </div>

      {/* Eye icon toggle + Delete button */}
      <Focusable style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <DialogButton
          onClick={onToggleHidden}
          disabled={disabled}
          style={{
            minWidth: "unset",
            width: "40px",
            height: "32px",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isHidden ? <FaEyeSlash style={{ color: "rgba(255,255,255,0.4)" }} /> : <FaEye />}
        </DialogButton>
        <DialogButton
          onClick={handleDelete}
          disabled={disabled}
          style={{
            minWidth: "unset",
            height: "32px",
            padding: "4px 10px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: "#ff6666",
          }}
        >
          <FaTrash style={{ fontSize: "12px" }} />
          <span style={{ fontSize: "12px" }}>{t("delete")}</span>
        </DialogButton>
      </Focusable>
    </div>
  );
};

// Props for the settings panel
interface AdvancedSettingsPanelProps {
  onBack: () => void;
}

// Main Advanced Settings sidebar panel
const AdvancedSettingsPanel: FC<AdvancedSettingsPanelProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<BootEntry[]>([]);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [hiddenEntries, setHiddenEntries] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliasesRef = useRef(aliases);
  const hiddenRef = useRef(hiddenEntries);
  aliasesRef.current = aliases;
  hiddenRef.current = hiddenEntries;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bootResult, settingsResult] = await Promise.all([getBootInfo(), getSettings()]);

      let loadedAliases: Record<string, string> = {};
      let loadedHidden: string[] = [];

      if (settingsResult.success && settingsResult.data) {
        loadedAliases = { ...(settingsResult.data.aliases || {}) };
        loadedHidden = settingsResult.data.hidden || [];
      }

      if (bootResult.success && bootResult.data) {
        const parsed = parseBootOutput(bootResult.data);
        if (parsed) {
          setEntries(parsed.entries);
          // Pre-populate default alias "Windows" for Windows Boot Manager entries
          for (const entry of parsed.entries) {
            if (
              entry.label.toLowerCase().includes("windows boot manager") &&
              !loadedAliases[entry.number]
            ) {
              loadedAliases[entry.number] = "Windows";
            }
          }
        }
      }

      setAliases(loadedAliases);
      setHiddenEntries(loadedHidden);
    } catch (e) {
      console.error("Failed to load data:", e);
      toaster.toast({ title: t("error"), body: String(e) });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced auto-save
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const result = await saveSettings(aliasesRef.current, hiddenRef.current);
        if (!result.success) {
          toaster.toast({ title: t("error"), body: result.error || t("settingsSaveFailed") });
        }
      } catch (e) {
        toaster.toast({ title: t("error"), body: String(e) });
      }
    }, 500);
  }, [t]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleAliasChange = (bootNum: string, alias: string) => {
    setAliases((prev) => {
      const next = { ...prev };
      if (alias) {
        next[bootNum] = alias;
      } else {
        delete next[bootNum];
      }
      return next;
    });
    scheduleSave();
  };

  const handleToggleHidden = (bootNum: string) => {
    setHiddenEntries((prev) => {
      if (prev.includes(bootNum)) {
        return prev.filter((n) => n !== bootNum);
      } else {
        return [...prev, bootNum];
      }
    });
    scheduleSave();
  };

  const handleDelete = async (bootNum: string) => {
    setLoading(true);
    try {
      const result = await deleteBootEntry(bootNum);
      if (result.success) {
        toaster.toast({ title: t("success"), body: t("deleteSuccess") });
        setEntries((prev) => prev.filter((e) => e.number !== bootNum));
        setAliases((prev) => {
          const next = { ...prev };
          delete next[bootNum];
          return next;
        });
        setHiddenEntries((prev) => prev.filter((n) => n !== bootNum));
      } else {
        toaster.toast({ title: t("error"), body: result.error || t("deleteFailed") });
      }
    } catch (e) {
      toaster.toast({ title: t("error"), body: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Action buttons */}
      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={onBack}>
            <FaArrowLeft style={{ marginRight: "6px" }} />
            {t("back")}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={loadData} disabled={loading}>
            <FaSync style={{ marginRight: "6px" }} />
            {t("refresh")}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      {/* All boot entries */}
      <PanelSection title={t("allBootEntries")}>
        {loading && (
          <PanelSectionRow>
            <div style={{ padding: "8px", fontSize: "13px" }}>{t("loading")}</div>
          </PanelSectionRow>
        )}

        {!loading && entries.length === 0 && (
          <PanelSectionRow>
            <div style={{ padding: "8px", fontSize: "13px" }}>{t("noBootEntries")}</div>
          </PanelSectionRow>
        )}

        {!loading &&
          entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              alias={aliases[entry.number] || ""}
              isHidden={hiddenEntries.includes(entry.number)}
              onAliasChange={(alias) => handleAliasChange(entry.number, alias)}
              onToggleHidden={() => handleToggleHidden(entry.number)}
              onDelete={() => handleDelete(entry.number)}
              disabled={loading}
            />
          ))}
      </PanelSection>

    </>
  );
};

export default AdvancedSettingsPanel;
