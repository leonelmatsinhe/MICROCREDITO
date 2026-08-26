import { Request, Response } from "express";
import { UserModel } from "../database/models/UserModel";
import bcryptjs from "bcryptjs";
import * as jwt from "jsonwebtoken";

const findAll = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const users = await UserModel.findAll({
      where: {
        companyId: id,
      },
      order: [["name", "DESC"]],
    });
    return users.length > 0
      ? res.status(200).json({ success: true, result: users })
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
      ? res.status(200).json({ success: true, result: user })
      : res.status(204).json({ success: false, message: "User not found." });
  } catch (err: any) {
    console.error("Erro ao buscar utilizador:", err.message);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

const create = async (req: Request, res: Response) => {
  let { name, email, password, phone, status, companyId, userRole } = req.body;

  bcryptjs.hash(password + "", 10, async (hashError, hash) => {
    if (hashError) {
      return res.status(500).json({
        success: false,
        message: hashError,
      });
    }
    const user = await UserModel.create({
      name,
      email,
      password: hash,
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
  });
};

const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userUpdation = await UserModel.update(req.body, {
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

    const token = jwt.sign(
      { id: user.getDataValue("id") },
      process.env.APP_SECRET + "",
      {
        expiresIn: "1h",
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

    bcryptjs.hash(newPassword + "", 10, async (hashError, hash) => {
      if (hashError) {
        return res.status(500).json({
          success: false,
          message: hashError,
        });
      } else {
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
      }
    });
  } catch (err: any) {
    console.error("Erro ao alterar senha:", err.message);
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
};
