import puppeteer from "puppeteer";
import fs from "fs-extra"
import path from "path"
import hbs from "handlebars"
import moment from "moment";

moment.locale("pt-br");

const compile = async function (templateName: any, data: any) {
    const filePath = path.join(process.cwd(), "templates", `${templateName}.hbs`);
    const html = await fs.readFile(filePath, "utf-8");
    return hbs.compile(html)(data);
};

hbs.registerHelper("dateFormat", function (value, format) {
    console.log("formatting", value, format);
    return moment(value).format(format).toUpperCase();
});

const generateContrat = async (company: any, customer: any, amortization: any) => {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        const content = await compile("invoice", {
            company,
            customer,
            amortization
        });

        await page.setContent(content);
        await page.emulateMediaType("screen");
        await page.pdf({
            path: `./uploads/docs/${customer.accountNumber}.pdf`,
            format: "A4",
            printBackground: true,
        });

        console.log("Done generating invoice.");
        await browser.close();
        return true;
    } catch (e) {
        console.log("There was an error generating the invoice.", e);
        return false;
    }
}

export { generateContrat }