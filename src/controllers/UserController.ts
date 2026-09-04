import { Request, Response } from "express";
import { UserModel } from "../database/models/UserModel";
import bcryptjs from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { hashPasswordIfNeeded } from "../utils/password";

// Remove o hash da senha antes de devolver o utilizador ao frontend — a BD é a
// única fonte de verdade para login e nenhum hash deve voltar a ser reenviado.
const stripPassword = (user: any) => {
  const plain = user?.toJSON ? user.toJSON() : user;
  if (!plain) return plain;
  delete plain.password;
  return plain;
};

const findAll = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const users = await UserModel.findAll({
      where: {
        companyId: id,
      },
      order: [["name", "DESC"]],
    });
    const safeUsers = users.map(stripPassword);
    return safeUsers.length > 0
      ? res.status(200).json({ success: true, result: safeUsers })
      : res.status(204).json({ success: false, message: "Users not found." });
  } catch (err: any) {
    console.error("Erro ao buscar utilizadores:", err.message);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

const findOne = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findOne({
      where: {
        id: id,
      },
    });
    return user
      ? res.status(200).json({ success: true, result: stripPassword(user) })
      : res.status(204).json({ success: false, message: "User not found." });
  } catch (err: any) {
    console.error("Erro ao buscar utilizador:", err.message);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

const create = async (req: Request, res: Response) => {
  try {
    let { name, email, password, phone, status, companyId, userRole } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Campos obrigatórios: name, email e password.",
      });
    }

    // Hash bcrypt — mas nunca voltar a encriptar um valor que já seja hash
    const storedPassword = hashPasswordIfNeeded(password);
    const user = await UserModel.create({
      name,
      email,
      password: storedPassword,
      updatedPassword: 0,
      phone,
      status,
      companyId,
      userRole,
    });
    return user != null
      ? res.status(201).send(
          JSON.stringify({
            success: true,
            message: "User created successfully.",
          })
        )
      : res.status(204).send(
          JSON.stringify({
            success: false,
            message: "There was an error registring this user.",
          })
        );
  } catch (err: any) {
    console.error("Erro ao criar utilizador:", err?.message || err);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password, ...rest } = req.body;

    // Nunca guardar a senha em texto simples: hashear sempre que vier no body —
    // mas nunca voltar a encriptar um valor que já seja hash (double-hash
    // tornaria o login impossível).
    const data = { ...rest };
    if (password) {
      data.password = hashPasswordIfNeeded(password);
    }

    const userUpdation = await UserModel.update(data, {
      where: {
        id: id,
      },
    });
    return userUpdation != null
      ? res.status(201).send(
          JSON.stringify({
            success: true,
            message: "User successfully updated.",
          })
        )
      : res.status(204).send(
          JSON.stringify({
            success: false,
            message: "There was an error updating this user.",
          })
        );
  } catch (err: any) {
    console.error("Erro ao atualizar utilizador:", err.message);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

const destroy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleteUser = await UserModel.destroy({ where: { id: id } });
    return deleteUser != null
      ? res.status(201).send(
          JSON.stringify({
            success: true,
            message: "User deleted successfully.",
          })
        )
      : res.status(204).send(
          JSON.stringify({
            success: false,
            message: "There was an error deleting this user.",
          })
        );
  } catch (err: any) {
    console.error("Erro ao eliminar utilizador:", err.message);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "E-mail e senha são obrigatórios.",
      });
    }

    const user = await UserModel.findOne({
      where: {
        email,
        status: 1,
      },
    });

    if (!user) {
      return res.status(200).json({ success: false, message: "Utilizador não encontrado." });
    }

    const storedPassword = user.getDataValue("password");
    const isPasswordValid = await bcryptjs.compare(password + "", storedPassword);

    if (!isPasswordValid) {
      return res
        .status(200)
        .send(JSON.stringify({ success: false, message: "Senha incorreta." }));
    }

    // Token com expiração longa (24h) - a expiração por inactividade é controlada pelo frontend
    const token = jwt.sign(
      { id: user.getDataValue("id") },
      process.env.APP_SECRET + "",
      {
        expiresIn: "24h",
      }
    );

    const data = [
      {
        id: user.getDataValue("id"),
        companyId: user.getDataValue("companyId"),
        name: user.getDataValue("name"),
        email: user.getDataValue("email"),
        phone: user.getDataValue("phone"),
        userRole: user.getDataValue("userRole"),
        updatedPassword: user.getDataValue("updatedPassword"),
        status: user.getDataValue("status"),
        token: token,
        createdAt: user.getDataValue("createdAt"),
        updatedAt: user.getDataValue("updatedAt"),
      },
    ];

    return res.send(JSON.stringify({ success: true, result: data }));
  } catch (err: any) {
    console.error("Erro no login:", err.message);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

const changeUserPassword = async (req: Request, res: Response) => {
  try {
    const { email, password, newPassword, updatedPassword } = req.body;

    if (!email || !password || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "E-mail, senha actual e nova senha são obrigatórios.",
      });
    }

    const user = await UserModel.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      return res.send(
        JSON.stringify({ success: false, message: "Utilizador não encontrado." })
      );
    }

    const storedPassword = user.getDataValue("password");
    const isPasswordValid = await bcryptjs.compare(password + "", storedPassword);

    if (!isPasswordValid) {
      return res.send(
        JSON.stringify({
          success: false,
          message: "Senha incorreta. Tente novamente.",
        })
      );
    }

    // Hash bcrypt — nunca voltar a encriptar um valor que já seja hash
    const hash = hashPasswordIfNeeded(newPassword + "");
    const userUpdation = await UserModel.update(
      { password: hash, updatedPassword: updatedPassword },
      {
        where: {
          id: user.getDataValue("id"),
        },
      }
    );
    return userUpdation != null
      ? res.status(201).send(
          JSON.stringify({
            success: true,
            message: "Senha atualizada com sucesso.",
          })
        )
      : res.send(
          JSON.stringify({
            success: false,
            message: "Erro ao atualizar a senha.",
          })
        );
  } catch (err: any) {
    console.error("Erro ao alterar senha:", err.message);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

const refreshToken = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Token required" });
    }

    const [, token] = authHeader.split(" ");
    try {
      const decoded = jwt.verify(token, process.env.APP_SECRET + "") as any;
      
      // Gerar novo token com 24h de validade
      const newToken = jwt.sign(
        { id: decoded.id },
        process.env.APP_SECRET + "",
        { expiresIn: "24h" }
      );

      return res.json({ success: true, token: newToken });
    } catch (error) {
      return res.status(401).json({ success: false, message: "Token invalid or expired" });
    }
  } catch (err: any) {
    console.error("Erro ao renovar token:", err.message);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

export {
  findAll,
  findOne,
  create,
  destroy,
  update,
  loginUser,
  changeUserPassword,
  refreshToken,
};
