import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Token is required!" });
  }

  // Bearer dfjklmf48354n6hmkvmrejn45486
  const [, token] = authHeader.split(" ");
  try {
    jwt.verify(token, process.env.APP_SECRET + "");
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Token invalid" });
  }
};
