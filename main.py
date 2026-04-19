import os
import re
import subprocess
from typing import List, Dict

# The decky plugin module is located at decky-loader/plugin
# For easy intellisense checkout the decky-loader code repo
# and add the `decky-loader/plugin/imports` path to `python.analysis.extraPaths` in `.vscode/settings.json`
import decky
import asyncio

# Add py_modules to path
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "py_modules"))
from plugin_settings import Settings

BOOT_NUM_PATTERN = re.compile(r"^\d{4}$")

class Plugin:
    settings: Settings = None

    # Get EFI boot information
    async def get_boot_info(self) -> Dict:
        """Get all EFI boot entries using efibootmgr -v"""
        try:
            result = subprocess.run(
                ["efibootmgr", "-v"],
                capture_output=True,
                text=True,
                check=True
            )
            return {"success": True, "data": result.stdout}
        except FileNotFoundError:
            decky.logger.error("efibootmgr not found")
            return {"success": False, "error": "efibootmgr is not installed or not available"}
        except subprocess.CalledProcessError as e:
            decky.logger.error(f"Failed to get boot info: {e.stderr}")
            return {"success": False, "error": e.stderr or str(e)}
        except Exception as e:
            decky.logger.error(f"Unexpected error: {e}")
            return {"success": False, "error": str(e)}
    
    async def set_boot_order(self, order: List[str]) -> Dict:
        """Set the boot order using efibootmgr -o"""
        try:
            order_str = ",".join(order)
            result = subprocess.run(
                ["efibootmgr", "-o", order_str],
                capture_output=True,
                text=True,
                check=True
            )
            decky.logger.info(f"Boot order set to: {order_str}")
            return {"success": True}
        except subprocess.CalledProcessError as e:
            decky.logger.error(f"Failed to set boot order: {e.stderr}")
            return {"success": False, "error": e.stderr or str(e)}
        except Exception as e:
            decky.logger.error(f"Unexpected error: {e}")
            return {"success": False, "error": str(e)}
    
    async def set_boot_next(self, boot_num: str) -> Dict:
        """Set the next boot entry using efibootmgr -n"""
        try:
            result = subprocess.run(
                ["efibootmgr", "-n", boot_num],
                capture_output=True,
                text=True,
                check=True
            )
            decky.logger.info(f"BootNext set to: {boot_num}")
            return {"success": True}
        except subprocess.CalledProcessError as e:
            decky.logger.error(f"Failed to set boot next: {e.stderr}")
            return {"success": False, "error": e.stderr or str(e)}
        except Exception as e:
            decky.logger.error(f"Unexpected error: {e}")
            return {"success": False, "error": str(e)}

    async def get_settings(self) -> Dict:
        """Get all plugin settings (aliases, hidden entries)."""
        try:
            if self.settings is None:
                self.settings = Settings()
            return {"success": True, "data": self.settings.get_all()}
        except Exception as e:
            decky.logger.error(f"Failed to get settings: {e}")
            return {"success": False, "error": str(e)}

    async def save_settings(self, aliases: dict, hidden: list) -> Dict:
        """Save plugin settings (aliases, hidden entries)."""
        try:
            if self.settings is None:
                self.settings = Settings()
            self.settings.update_all(aliases, hidden)
            decky.logger.info("Settings saved")
            return {"success": True}
        except Exception as e:
            decky.logger.error(f"Failed to save settings: {e}")
            return {"success": False, "error": str(e)}

    async def delete_boot_entry(self, boot_num: str) -> Dict:
        """Delete a boot entry using efibootmgr -b <num> -B"""
        try:
            if not BOOT_NUM_PATTERN.match(boot_num):
                return {"success": False, "error": "Invalid boot number format"}
            result = subprocess.run(
                ["efibootmgr", "-b", boot_num, "-B"],
                capture_output=True,
                text=True,
                check=True
            )
            decky.logger.info(f"Deleted boot entry: Boot{boot_num}")
            return {"success": True}
        except subprocess.CalledProcessError as e:
            decky.logger.error(f"Failed to delete boot entry: {e.stderr}")
            return {"success": False, "error": e.stderr or str(e)}
        except Exception as e:
            decky.logger.error(f"Unexpected error: {e}")
            return {"success": False, "error": str(e)}


    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        self.settings = Settings()
        self.loop = asyncio.get_event_loop()
        decky.logger.info("EFI Boot Manager plugin loaded")

    # Function called first during the unload process, utilize this to handle your plugin being stopped, but not
    # completely removed
    async def _unload(self):
        decky.logger.info("EFI Boot Manager plugin unloaded")
        pass

    # Function called after `_unload` during uninstall, utilize this to clean up processes and other remnants of your
    # plugin that may remain on the system
    async def _uninstall(self):
        decky.logger.info("EFI Boot Manager plugin uninstalled")
        pass

    # Migrations that should be performed before entering `_main()`.
    async def _migration(self):
        pass
