from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import socket
import subprocess
import sys
import threading
import time
import tkinter as tk
from dataclasses import dataclass
from datetime import datetime
from logging.handlers import RotatingFileHandler
from tkinter import messagebox, ttk
from typing import Any, Dict, Optional

import requests

try:
    import win32api  # type: ignore
    import win32con  # type: ignore
    import win32crypt  # type: ignore
    import win32print  # type: ignore
    import winreg  # type: ignore
except Exception:
    win32api = None
    win32con = None
    win32crypt = None
    win32print = None
    import winreg  # type: ignore

APP_NAME = "Montis Printer Agent"
APP_DIR = os.path.join(os.getenv("APPDATA") or os.getcwd(), "MontisPrinterAgent")
STATE_PATH = os.path.join(APP_DIR, "agent_state.dat")
LOG_PATH = os.path.join(APP_DIR, "agent.log")
DEFAULT_API_BASE = os.getenv("MONTIS_API_BASE", "https://montis-cloud-backend.onrender.com").rstrip("/")
POLL_SECONDS = 3
JOB_LIMIT = 5
SINGLE_INSTANCE_PORT = 51321


@dataclass
class AgentState:
    api_base: str
    printer_id: str
    api_key: str
    fingerprint: str
    printer_name: str


def normalize_api_base(value: str) -> str:
    base = (value or "").strip().rstrip("/")
    if base.lower().endswith("/api"):
        base = base[:-4]
    return base


def ensure_app_dir() -> None:
    os.makedirs(APP_DIR, exist_ok=True)


def setup_logger() -> logging.Logger:
    ensure_app_dir()
    logger = logging.getLogger("montis_printer_agent")
    logger.setLevel(logging.INFO)

    if logger.handlers:
        return logger

    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    fh = RotatingFileHandler(LOG_PATH, maxBytes=512 * 1024, backupCount=3, encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    return logger


def hostname() -> str:
    try:
        return socket.gethostname()
    except Exception:
        return "unknown-host"


def os_name() -> str:
    return f"{sys.platform}-{sys.getwindowsversion().major}.{sys.getwindowsversion().minor}" if hasattr(sys, "getwindowsversion") else sys.platform


def machine_guid() -> str:
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography")
        value, _ = winreg.QueryValueEx(key, "MachineGuid")
        return str(value)
    except Exception:
        return "no-machine-guid"


def fingerprint() -> str:
    raw = f"{machine_guid()}|{hostname()}|{os.getenv('PROCESSOR_IDENTIFIER', '')}|{os.getenv('COMPUTERNAME', '')}"
    return hashlib.sha256(raw.encode("utf-8", errors="ignore")).hexdigest()


def protect_bytes(value: bytes) -> bytes:
    if win32crypt is None:
        return base64.b64encode(value)
    blob = win32crypt.CryptProtectData(value, APP_NAME, None, None, None, 0)
    return blob


def unprotect_bytes(value: bytes) -> bytes:
    if win32crypt is None:
        return base64.b64decode(value)
    return win32crypt.CryptUnprotectData(value, None, None, None, 0)[1]


def save_state(state: AgentState) -> None:
    ensure_app_dir()
    payload = json.dumps(state.__dict__, ensure_ascii=False).encode("utf-8")
    data = protect_bytes(payload)
    with open(STATE_PATH, "wb") as f:
        f.write(data)


def load_state() -> Optional[AgentState]:
    if not os.path.exists(STATE_PATH):
        return None
    try:
        with open(STATE_PATH, "rb") as f:
            raw = f.read()
        payload = unprotect_bytes(raw)
        data = json.loads(payload.decode("utf-8"))
        required = ["api_base", "printer_id", "api_key", "fingerprint", "printer_name"]
        if not all(key in data and data[key] for key in required):
            return None
        return AgentState(**{key: data[key] for key in required})
    except Exception:
        return None


def get_default_printer_name() -> Optional[str]:
    if win32print is None:
        return None
    try:
        return win32print.GetDefaultPrinter()
    except Exception:
        return None


def get_installed_printers() -> list[str]:
    if win32print is None:
        return []
    try:
        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        rows = win32print.EnumPrinters(flags)
        names: list[str] = []
        for row in rows:
            if len(row) >= 3 and row[2]:
                names.append(str(row[2]))
        return sorted(list(set(names)))
    except Exception:
        return []


def autodetect_printer() -> Optional[str]:
    names = get_installed_printers()
    if not names:
        return get_default_printer_name()

    default_name = get_default_printer_name()
    if default_name and default_name in names:
        return default_name

    thermal_keywords = [
        "tm-t", "epson", "pos", "thermal", "ticket", "receipt", "58mm", "80mm", "star", "bixolon"
    ]
    for name in names:
        lower_name = name.lower()
        if any(keyword in lower_name for keyword in thermal_keywords):
            return name

    if len(names) == 1:
        return names[0]

    return default_name or names[0]


def escpos_font_cmd(font_size: str) -> bytes:
    # GS ! n
    if (font_size or '').lower() == 'large':
        return bytes([0x1D, 0x21, 0x11])
    return bytes([0x1D, 0x21, 0x00])


def escpos_wrap(text: str, encoding: str = "cp850", cut: bool = True, font_size: str = 'normal') -> bytes:
    esc_init = bytes([0x1B, 0x40])
    esc_codepage = bytes([0x1B, 0x74, 0x02])
    gs_cut = bytes([0x1D, 0x56, 0x00])
    payload = text.encode(encoding, errors="replace")
    data = esc_init + esc_codepage + escpos_font_cmd(font_size) + payload + b"\n\n\n"
    if cut:
        data += gs_cut
    return data


def print_bytes(printer_name: str, data: bytes) -> None:
    if win32print is None:
        raise RuntimeError("pywin32 no disponible")

    handle = win32print.OpenPrinter(printer_name)
    try:
        win32print.StartDocPrinter(handle, 1, ("Montis Kitchen Ticket", None, "RAW"))
        try:
            win32print.StartPagePrinter(handle)
            win32print.WritePrinter(handle, data)
            win32print.EndPagePrinter(handle)
        finally:
            win32print.EndDocPrinter(handle)
    finally:
        win32print.ClosePrinter(handle)


def dividir_texto(texto: str, max_len: int) -> list[str]:
    if len(texto) <= max_len:
        return [texto]
    palabras = texto.split(" ")
    lineas: list[str] = []
    actual = ""
    for palabra in palabras:
        candidate = (actual + " " + palabra).strip()
        if len(candidate) <= max_len:
            actual = candidate
        else:
            if actual:
                lineas.append(actual)
            actual = palabra
    if actual:
        lineas.append(actual)
    return lineas


def resolve_format(payload: Dict[str, Any]) -> tuple[int, str, str]:
    fmt = payload.get('__format') if isinstance(payload, dict) else None
    if not isinstance(fmt, dict):
        fmt = {}
    paper_width = fmt.get('paperWidth') or fmt.get('paper_width') or '80mm'
    font_size = fmt.get('fontSize') or fmt.get('font_size') or 'normal'
    base = 32 if paper_width == '58mm' else 48
    width = base // 2 if str(font_size).lower() == 'large' else base
    return width, str(paper_width), str(font_size)


def format_ticket(payload: Dict[str, Any], width: int = 48) -> str:
    sep = "=" * width
    sep2 = "-" * width

    lineas = [
        f"Fecha: {datetime.now().strftime('%Y-%m-%d')}",
        f"Hora:  {datetime.now().strftime('%H:%M')}",
    ]

    usuario = payload.get("usuario") or {}
    nombre_usuario = str(usuario.get("nombre") or "Usuario")
    encabezado = f"Atendido por: {nombre_usuario}"
    if len(encabezado) <= width:
        lineas.append(encabezado)
    else:
        lineas.append("Atendido por:")
        lineas.extend(["  " + parte for parte in dividir_texto(nombre_usuario, width - 2)])

    tipo = payload.get("tipo_pedido") or payload.get("tipoPedido") or "mesa"
    cliente = payload.get("cliente") or {}
    mesas = payload.get("mesas") or []

    lineas.append("")
    if tipo == "domicilio" and isinstance(cliente, dict):
        es_para_llevar = bool(cliente.get("es_para_llevar") or cliente.get("esParaLlevar"))
        lineas.append("*** PARA LLEVAR ***" if es_para_llevar else "*** DOMICILIO ***")
        lineas.append(f"Cliente: {cliente.get('nombre') or 'Cliente'}")
        telefono = cliente.get("telefono")
        if telefono:
            lineas.append(f"Tel: {telefono}")
        direccion = cliente.get("direccion")
        if direccion and not es_para_llevar:
            lineas.append("Direccion:")
            lineas.extend(["  " + parte for parte in dividir_texto(str(direccion), width - 2)])
    else:
        mesa_txt = ", ".join([str(m.get("numero") or "") for m in mesas if isinstance(m, dict)])
        if mesa_txt:
            if len(mesa_txt) <= (width - 8):
                lineas.append(f"Mesa(s): {mesa_txt}")
            else:
                lineas.append("Mesa(s):")
                lineas.extend(["  " + parte for parte in dividir_texto(mesa_txt, width - 2)])

    lineas.extend(["", sep, "     COMANDA DE COCINA", sep, ""])

    items = payload.get("items") or []
    if not items:
        lineas.append("(Sin items)")
    else:
        for idx, item in enumerate(items):
            if idx > 0:
                lineas.append(sep2)
            cantidad = item.get("cantidad")
            nombre = item.get("nombre") or "Producto"
            titulo = f"{cantidad}x {nombre}" if cantidad is not None else str(nombre)
            if len(titulo) <= width:
                lineas.append(titulo)
            else:
                lineas.append(f"{cantidad}x")
                lineas.extend(["  " + parte for parte in dividir_texto(str(nombre), width - 2)])

            personalizaciones = item.get("personalizaciones") or []
            if isinstance(personalizaciones, list):
                lineas.extend(["  " + str(p) for p in personalizaciones if p])

            obs = str(item.get("observaciones") or "").strip()
            if obs:
                lineas.append("")
                lineas.append("  OBSERVACIONES:")
                lineas.extend(["    " + parte for parte in dividir_texto(obs, width - 4)])

    obs_generales = str(payload.get("observaciones_generales") or "").strip()
    if obs_generales:
        lineas.extend(["", sep, "OBSERVACIONES GENERALES:"])
        lineas.extend(dividir_texto(obs_generales, width))

    lineas.extend(["", "     ENVIADO A COCINA", sep, sep])
    return "\n".join(lineas)


def register_startup(logger: logging.Logger) -> None:
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            0,
            winreg.KEY_SET_VALUE,
        )
        executable_path = sys.executable if getattr(sys, "frozen", False) else os.path.abspath(__file__)
        if executable_path.lower().endswith(".py"):
            pythonw = os.path.join(sys.exec_prefix, "pythonw.exe")
            value = f'"{pythonw}" "{executable_path}" --background'
        else:
            value = f'"{executable_path}" --background'
        winreg.SetValueEx(key, "MontisPrinterAgent", 0, winreg.REG_SZ, value)
        winreg.CloseKey(key)
    except Exception as error:
        logger.warning(f"No se pudo registrar autoinicio: {error}")


def pair_device(api_base: str, logger: logging.Logger, existing_state: Optional[AgentState] = None) -> Optional[AgentState]:
    api_base = normalize_api_base(api_base)
    installed_printers = get_installed_printers()
    detected_printer = (
        existing_state.printer_name
        if existing_state and existing_state.printer_name
        else (autodetect_printer() or "")
    )
    machine_fp = fingerprint()

    root = tk.Tk()
    root.title("Montis - Activar impresora")
    root.geometry("480x340")
    root.resizable(False, False)

    tk.Label(root, text="Activación de impresora de cocina", font=("Segoe UI", 12, "bold")).pack(pady=(16, 6))
    tk.Label(root, text="Ingresa el código de activación generado en Configuración de Impresión", font=("Segoe UI", 10)).pack(pady=(0, 4))

    code_var = tk.StringVar()
    entry = tk.Entry(root, textvariable=code_var, font=("Consolas", 13), justify="center")
    entry.pack(fill="x", padx=20, pady=(0, 10))
    entry.focus_set()

    tk.Label(root, text="Selecciona la impresora a usar:", font=("Segoe UI", 10)).pack()
    selected_printer_var = tk.StringVar(value=detected_printer)
    printer_combo = ttk.Combobox(root, textvariable=selected_printer_var, state="readonly", font=("Segoe UI", 10))
    printer_combo.pack(fill="x", padx=20, pady=(6, 4))

    status_var = tk.StringVar(value="")
    tk.Label(root, textvariable=status_var, fg="#334155", font=("Segoe UI", 9)).pack(pady=(0, 8))

    def refresh_printers() -> None:
        nonlocal installed_printers
        installed_printers = get_installed_printers()
        if not installed_printers:
            printer_combo["values"] = []
            selected_printer_var.set("")
            status_var.set("No se encontraron impresoras instaladas en Windows.")
            return

        printer_combo["values"] = installed_printers
        current = selected_printer_var.get().strip()
        if current and current in installed_printers:
            selected_printer_var.set(current)
        elif detected_printer and detected_printer in installed_printers:
            selected_printer_var.set(detected_printer)
        else:
            selected_printer_var.set(installed_printers[0])
        status_var.set(f"Impresoras encontradas: {len(installed_printers)}")

    refresh_printers()

    tk.Button(root, text="Actualizar lista", command=refresh_printers, padx=10, pady=4).pack(pady=(0, 10))

    result: dict[str, Any] = {"cancelled": True}

    def selected_printer() -> str:
        value = selected_printer_var.get().strip()
        return value

    def save_only() -> None:
        if not existing_state:
            messagebox.showwarning("Montis", "Debes activar primero con un código.")
            return

        chosen_printer = selected_printer()
        if not chosen_printer:
            messagebox.showwarning("Montis", "Selecciona una impresora antes de continuar.")
            return

        updated_state = AgentState(
            api_base=normalize_api_base(existing_state.api_base),
            printer_id=existing_state.printer_id,
            api_key=existing_state.api_key,
            fingerprint=existing_state.fingerprint,
            printer_name=chosen_printer,
        )
        result["state"] = updated_state
        result["cancelled"] = False
        messagebox.showinfo("Montis", "Configuración guardada. La impresora local fue actualizada.")
        root.destroy()

    def submit() -> None:
        token = code_var.get().strip()
        if not token:
            messagebox.showwarning("Montis", "Ingresa el código de activación.")
            return

        chosen_printer = selected_printer()
        if not chosen_printer:
            messagebox.showwarning("Montis", "Selecciona una impresora antes de activar.")
            return

        try:
            response = requests.post(
                f"{api_base}/api/print/pair",
                json={
                    "pairingToken": token,
                    "hostname": hostname(),
                    "os": os_name(),
                    "fingerprint": machine_fp,
                    "printerName": chosen_printer,
                },
                timeout=20,
            )
            payload: Dict[str, Any] = {}
            try:
                payload = response.json()
            except Exception:
                payload = {}

            if response.status_code == 404:
                raise RuntimeError(
                    "Servicio de activación no disponible. "
                    "Actualiza el backend y vuelve a intentar."
                )

            if response.status_code >= 400:
                raise RuntimeError(payload.get("error") or f"Error HTTP {response.status_code}")

            result["state"] = AgentState(
                api_base=api_base,
                printer_id=payload["printerId"],
                api_key=payload["apiKey"],
                fingerprint=machine_fp,
                printer_name=chosen_printer,
            )
            result["cancelled"] = False
            messagebox.showinfo("Montis", "Impresora activada correctamente. El agente seguirá en segundo plano.")
            root.destroy()
        except Exception as error:
            logger.warning(f"Error de activación: {error}")
            messagebox.showerror("Montis", f"No se pudo activar: {error}")

    button_frame = tk.Frame(root)
    button_frame.pack(pady=(4, 8))

    if existing_state:
        tk.Button(button_frame, text="Guardar impresora", command=save_only, bg="#0f766e", fg="white", padx=14, pady=8).pack(side="left", padx=6)
    tk.Button(button_frame, text="Activar", command=submit, bg="#2563eb", fg="white", padx=16, pady=8).pack(side="left", padx=6)

    tk.Label(root, text="Después de activar, no necesitas volver a configurar nada.", font=("Segoe UI", 9), fg="#475569").pack(pady=12)
    root.mainloop()

    if result.get("cancelled"):
        return None
    return result.get("state")


class Agent:
    def __init__(self, state: AgentState, logger: logging.Logger):
        self.state = state
        self.logger = logger
        self.start_time = time.time()
        self.last_heartbeat = 0.0
        self.session = requests.Session()
        self.session.headers.update(
            {
                "x-api-key": state.api_key,
                "x-device-fingerprint": state.fingerprint,
                "Content-Type": "application/json",
            }
        )

    def heartbeat(self) -> None:
        now = time.time()
        if now - self.last_heartbeat < 30:
            return
        self.last_heartbeat = now
        uptime = int(now - self.start_time)
        url = f"{self.state.api_base}/api/print/printers/{self.state.printer_id}/heartbeat"
        self.session.post(url, json={"uptime": uptime, "status": "ready", "meta": {"printer_name": self.state.printer_name}}, timeout=10)

    def reload_runtime_state(self) -> None:
        disk_state = load_state()
        if not disk_state:
            return

        if (
            disk_state.printer_id == self.state.printer_id
            and disk_state.api_key == self.state.api_key
            and disk_state.fingerprint == self.state.fingerprint
        ):
            if disk_state.printer_name != self.state.printer_name:
                self.logger.info(f"Impresora actualizada en configuración: {disk_state.printer_name}")
            self.state.printer_name = disk_state.printer_name
            self.state.api_base = normalize_api_base(disk_state.api_base)

    def fetch_jobs(self) -> list[Dict[str, Any]]:
        url = f"{self.state.api_base}/api/print/jobs"
        response = self.session.get(url, params={"status": "pending", "limit": str(JOB_LIMIT)}, timeout=20)
        response.raise_for_status()
        payload = response.json()
        jobs = payload.get("jobs") or []
        return jobs if isinstance(jobs, list) else []

    def ack(self, job_id: str, status: str, info: Optional[str] = None, reason: Optional[str] = None) -> None:
        url = f"{self.state.api_base}/api/print/jobs/{job_id}/ack"
        body: Dict[str, Any] = {"status": status}
        if info:
            body["info"] = info
        if reason:
            body["reason"] = reason
        if status == "done":
            body["printedAt"] = datetime.utcnow().isoformat() + "Z"
        response = self.session.post(url, json=body, timeout=20)
        response.raise_for_status()

    def process_job(self, job: Dict[str, Any]) -> None:
        job_id = str(job.get("id") or "")
        if not job_id:
            return

        payload = job.get("payload") or {}
        if not isinstance(payload, dict):
            payload = {"items": []}

        width, _paper_width, font_size = resolve_format(payload)

        text = payload.get("raw_text")
        if not text:
            text = format_ticket(payload, width=width)

        printer_name = self.state.printer_name or autodetect_printer() or get_default_printer_name()
        if not printer_name:
            raise RuntimeError("No se detectó una impresora instalada en Windows")

        print_bytes(printer_name, escpos_wrap(text, font_size=font_size))
        self.ack(job_id, "done", info="ok")
        self.logger.info(f"Job impreso: {job_id}")

    def run_forever(self) -> None:
        backoff = 0
        while True:
            try:
                self.reload_runtime_state()
                self.heartbeat()
                jobs = self.fetch_jobs()

                if not jobs:
                    backoff = 0
                    time.sleep(POLL_SECONDS)
                    continue

                for job in jobs:
                    attempts = 0
                    while True:
                        attempts += 1
                        try:
                            self.process_job(job)
                            break
                        except Exception as error:
                            self.logger.error(f"Error en job {job.get('id')}: {error}")
                            if attempts >= 3:
                                try:
                                    self.ack(str(job.get("id")), "failed", reason=str(error))
                                except Exception as ack_error:
                                    self.logger.error(f"No se pudo enviar ack failed: {ack_error}")
                                break
                            time.sleep(1)

                backoff = 0
            except Exception as error:
                backoff = 1 if backoff == 0 else min(backoff * 2, 60)
                self.logger.warning(f"Loop error: {error} (reintento en {backoff}s)")
                time.sleep(backoff)


def acquire_single_instance_lock() -> Optional[socket.socket]:
    lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        lock_socket.bind(("127.0.0.1", SINGLE_INSTANCE_PORT))
        lock_socket.listen(1)
        return lock_socket
    except OSError:
        try:
            lock_socket.close()
        except Exception:
            pass
        return None


def start_background_agent(logger: logging.Logger) -> None:
    executable_path = sys.executable if getattr(sys, "frozen", False) else os.path.abspath(__file__)

    try:
        if executable_path.lower().endswith(".py"):
            pythonw = os.path.join(sys.exec_prefix, "pythonw.exe")
            if not os.path.exists(pythonw):
                pythonw = sys.executable
            args = [pythonw, executable_path, "--background"]
        else:
            args = [executable_path, "--background"]

        creation_flags = 0
        if hasattr(subprocess, "DETACHED_PROCESS"):
            creation_flags |= subprocess.DETACHED_PROCESS  # type: ignore[attr-defined]
        if hasattr(subprocess, "CREATE_NEW_PROCESS_GROUP"):
            creation_flags |= subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]

        subprocess.Popen(args, close_fds=True, creationflags=creation_flags)
    except Exception as error:
        logger.warning(f"No se pudo iniciar agente en segundo plano: {error}")


def main() -> None:
    logger = setup_logger()
    logger.info("=== Montis Printer Agent ===")

    background_mode = "--background" in sys.argv

    state = load_state()

    if not background_mode:
        state = pair_device(DEFAULT_API_BASE if not state else state.api_base, logger, state)
        if not state:
            logger.info("Activación cancelada por el usuario.")
            return
        save_state(state)
        register_startup(logger)
        start_background_agent(logger)
        return

    if not state:
        logger.info("No hay estado guardado para ejecutar en segundo plano.")
        return

    register_startup(logger)

    lock = acquire_single_instance_lock()
    if not lock:
        logger.info("Ya existe una instancia en segundo plano ejecutándose.")
        return

    # Si la impresora guardada ya no existe, intentamos autodetectar una nueva
    installed = get_installed_printers()
    if installed and state.printer_name not in installed:
        detected = autodetect_printer()
        if detected:
            state.printer_name = detected
            save_state(state)

    agent = Agent(state, logger)

    worker = threading.Thread(target=agent.run_forever, daemon=False)
    worker.start()
    worker.join()


if __name__ == "__main__":
    main()
