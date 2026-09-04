import bcryptjs from "bcryptjs";

// Detecta se o valor já é um hash bcrypt (ex.: veio da BD, não de um formulário).
// Impede o "double-hash": encriptar uma senha que já foi encriptada torna o
// login impossível, porque o bcrypt compara sempre contra o hash original.
export const isBcryptHash = (value: any): boolean => {
  const str = String(value ?? "");
  // bcrypt: $2a$/$2b$/$2y$ + custo (2 dígitos) + $ + 53 caracteres base64 = 60
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str);
};

// Devolve o valor pronto a guardar na coluna password:
// - se já for hash bcrypt → tal qual (nunca voltar a encriptar);
// - senha em texto simples → hashSync.
export const hashPasswordIfNeeded = (password: any): string => {
  const value = String(password ?? "");
  if (!value) return value;
  return isBcryptHash(value) ? value : bcryptjs.hashSync(value, 10);
};
