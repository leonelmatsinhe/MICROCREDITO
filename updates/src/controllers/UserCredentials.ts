import { Request, Response } from "express";
import nodemailer from "nodemailer";

const sendUserCredentials = async (req: Request, res: Response) => {
  const { emailRecipient, password } = req.body;
  const transporter = nodemailer.createTransport({
    host: "mail.outboxsolutions.co.mz",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_SECRET,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  transporter
    .sendMail({
      from: process.env.EMAIL_USER,
      to: emailRecipient,
      subject: "+Mola - credenciais!",
      html: `<p>Olá, as suas credenciais para acessar a plataforma <b>+Mola</b> são: E-MAIL: <b>${emailRecipient}</b><br>SENHA: <b>${password}</b><br><b>Link da Plataforma:</b> <a href="http://maismola.outboxsolutions.co.mz/">+Mola</a>. <br><br><br><br><b>DISCLAIMER:</b></br>
                A presente mensagem é destinada exclusivamente,  a quem é dirigida, podendo conter informação
                confidencial e/ou legalmente protegida. Caso não seja o destinatário desta mensagem, fica desde já notificado que
                o +Mola não o autoriza a divulgar, copiar, distribuir, examinar ou, de qualquer forma, utilizar a informação contida na
                mesma. Por favor notifique imediatamente ao remetente e apague a mensagem do seu Sistema.`,
    })
    .then((result) => {
      return res
        .status(200)
        .send({ success: true, message: "Credenciais enviado com sucesso." });
    })
    .catch((err) => {
      return res.status(404).send({ success: true, message: err });
    });
};

export { sendUserCredentials };
