import os
import json
import decky


class Settings:
    def __init__(self):
        self.settings_dir = decky.DECKY_PLUGIN_SETTINGS_DIR
        self.settings_file = os.path.join(self.settings_dir, "settings.json")
        self.data = {"aliases": {}, "hidden": []}
        self.load()

    def load(self):
        """Load settings from JSON file."""
        try:
            if os.path.exists(self.settings_file):
                with open(self.settings_file, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    if isinstance(loaded.get("aliases"), dict):
                        self.data["aliases"] = loaded["aliases"]
                    if isinstance(loaded.get("hidden"), list):
                        self.data["hidden"] = loaded["hidden"]
        except Exception as e:
            decky.logger.error(f"Failed to load settings: {e}")

    def save(self):
        """Save settings to JSON file."""
        try:
            os.makedirs(self.settings_dir, exist_ok=True)
            with open(self.settings_file, "w", encoding="utf-8") as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            decky.logger.error(f"Failed to save settings: {e}")
            raise

    def get_all(self):
        """Return all settings."""
        return dict(self.data)

    def set_alias(self, boot_num: str, alias: str):
        """Set alias for a boot entry."""
        if alias:
            self.data["aliases"][boot_num] = alias
        elif boot_num in self.data["aliases"]:
            del self.data["aliases"][boot_num]

    def set_hidden(self, boot_num: str, hidden: bool):
        """Set hidden state for a boot entry."""
        if hidden and boot_num not in self.data["hidden"]:
            self.data["hidden"].append(boot_num)
        elif not hidden and boot_num in self.data["hidden"]:
            self.data["hidden"].remove(boot_num)

    def update_all(self, aliases: dict, hidden: list):
        """Update all settings at once."""
        self.data["aliases"] = aliases if isinstance(aliases, dict) else {}
        self.data["hidden"] = hidden if isinstance(hidden, list) else []
        self.save()
