// Human labels for the Canonical Security Model's fields. Shared by the live learning
// feed and the teach panel so a field is named the same in both places.
export const FIELD_LABEL = {
  hostname: "Hostname",
  "services.telnet_enabled": "Telnet enabled",
  "services.ssh_enabled": "SSH enabled",
  "services.ssh_version": "SSH version",
  "services.http_server": "HTTP server (plaintext)",
  "services.cdp_enabled": "Discovery protocol",
  "services.snmp_communities": "SNMP community",
  "auth.enable_secret": "Enable secret (hashed)",
  "auth.password_encryption": "Password encryption",
  "auth.aaa_new_model": "AAA enabled",
  "logging.enabled": "Logging",
  "logging.hosts": "Log host",
  "ntp.configured": "NTP configured",
  "ntp.servers": "NTP server",
  "vty.transport_input": "Admin transport",
  "vty.access_class": "Admin access ACL",
  "vty.exec_timeout": "Idle timeout",
  banner_login: "Login banner",
};

export function fmtValue(v) {
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (Array.isArray(v)) {
    if (v.length && typeof v[0] === "object") return v.map((c) => `${c.name} (${c.access})`).join(", ");
    return v.length ? v.join(", ") : "none";
  }
  return String(v);
}
