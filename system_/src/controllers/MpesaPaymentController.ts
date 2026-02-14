import { Request, Response } from "express";
import mpesa from "mpesa-node-api";
import { MpesaResponse } from "../interfaces/Simulator";

const b2Customer = async (req: Request, res: Response) => {
  let { to, transaction, amount, reference } = req.body;

  mpesa
    .initiate_b2c(amount, to, transaction, reference)
    .then(function (response: MpesaResponse) {
      console.log(response);
      return res.send(JSON.stringify({ success: true, result: response }));
    })
    .catch(function (error: MpesaResponse) {
      console.log(error);
      return res.send(JSON.stringify({ success: false, result: error }));
    });
};

const c2Business = async (req: Request, res: Response) => {
  let { from, transaction, amount, reference } = req.body;

  mpesa
    .initiate_c2b(amount, from, transaction, reference)
    .then(function (response: MpesaResponse) {
      console.log(response);
      return res.send(JSON.stringify({ success: true, result: response }));
    })
    .catch(function (error: MpesaResponse) {
      console.log(error);
      return res.send(JSON.stringify({ success: false, result: error }));
    });
};

export { b2Customer, c2Business };
