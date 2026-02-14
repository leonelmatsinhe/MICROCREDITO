import { Request, Response } from "express";
import { UserModel } from "../database/models/UserModel";
import bcryptjs from "bcryptjs";
import * as jwt from "jsonwebtoken";

const findAll = async (req: Request, res: Response) => {
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
};

const findOne = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await UserModel.findOne({
    where: {
      id: id,
    },
  });
  return user
    ? res.status(200).json({ success: true, result: user })
    : res.status(204).json({ success: false, message: "User not found." });
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
};

const destroy = async (req: Request, res: Response) => {
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
};

const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  console.log(email, password)

  const user = await UserModel.findOne({
    where: {
      email,
      status: 1,
    },
  });
  if (user?.getDataValue.length == 1) {
    if (await bcryptjs.compare(password, user.getDataValue("password"))) {
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
    } else {
      return res
        .status(200)
        .send(JSON.stringify({ success: false, message: "Wrong password" }));
    }
  } else {
    return res.status(200).json({ success: false, message: "User not found" });
  }
};

const changeUserPassword = async (req: Request, res: Response) => {
  const { email, password, newPassword, updatedPassword } = req.body;

  const user = await UserModel.findOne({
    where: {
      email,
    },
  });
  if (user?.getDataValue.length === 1) {
    if (await bcryptjs.compare(password + "", user.getDataValue("password"))) {
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
                  message: "Password successfully updated.",
                })
              )
            : res.send(
                JSON.stringify({
                  success: false,
                  message: "There was an error updating the user password.",
                })
              );
        }
      });
    } else {
      return res.send(
        JSON.stringify({
          success: false,
          message:
            "There was an error updating your password. Please try again later.",
        })
      );
    }
  } else {
    return res.send(
      JSON.stringify({ success: false, message: "User not found" })
    );
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
