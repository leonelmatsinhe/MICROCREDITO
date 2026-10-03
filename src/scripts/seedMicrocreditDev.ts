import { db } from "../database/db";
import { MICRO_SECTORS } from "../services/microcreditService";

const tenantId = Number(process.env.MICROCREDIT_SEED_COMPANY_ID);
if (process.env.NODE_ENV === "production") throw new Error("Seed de demonstração desactivado em produção.");
if (!Number.isInteger(tenantId) || tenantId <= 0) throw new Error("Defina MICROCREDIT_SEED_COMPANY_ID para uma empresa de teste.");

const run = async () => {
  await db.authenticate();
  const [companies]: any = await db.query("SELECT id FROM companies WHERE id=?", { replacements: [tenantId] });
  if (!companies.length) throw new Error("Empresa indicada não existe.");
  const [existing]: any = await db.query("SELECT id FROM clientes_microcredito WHERE tenant_id=? LIMIT 1", { replacements: [tenantId] });
  if (existing.length) throw new Error("Tenant já contém clientes de microcrédito; seed cancelado sem alterações.");

  const sectors = [...MICRO_SECTORS];
  const names = ["Ana Mucavele", "João Cossa", "Maria Zandamela", "Pedro Nhantumbo", "Lúcia Bila", "António Machava", "Rosa Mabunda", "Carlos Sitoe", "Celina Manjate", "Tomás Baloi", "Elsa Matusse", "Bento Chongo", "Marta Cumbane"];
  const tx = await db.transaction();
  try {
    const clients: number[] = [];
    for (let i=0;i<names.length;i++) {
      const [result]: any = await db.query("INSERT INTO clientes_microcredito (tenant_id,nome,sexo,sector_actividade,estado,telefone,criado_por) VALUES (?,?,?,?, 'Activo',?,NULL)", { replacements: [tenantId,names[i],i%2===0?'Mulher':'Homem',sectors[i%sectors.length],`+258840000${String(i+1).padStart(3,'0')}`], transaction:tx });
      clients.push(Number(result.insertId));
    }
    const today = new Date();
    for (let i=0;i<4;i++) {
      const capital = 5000 + i*1000, rate = 5, months = 6, issued = `2025-${String(10+i%3).padStart(2,'0')}-01`;
      const monthlyPayment = capital*(rate/100)/(1-Math.pow(1+rate/100,-months));
      let balance=capital,totalInterest=0;
      const [result]: any = await db.query("INSERT INTO creditos (tenant_id,cliente_id,codigo,montante_capital,taxa_juro_mensal,prazo_meses,data_concessao,data_vencimento,sector_finalidade,estado,capital_em_divida,juro_em_divida,total_em_divida,juros_total,dias_atraso,agente_id) VALUES (?,?,?,?,?,?,?,DATE_ADD(?,INTERVAL ? MONTH),?,'Vigente',?,?,?, ?,0,NULL)", { replacements:[tenantId,clients[i],`SEED-${tenantId}-2025-${i+1}`,capital,rate,months,issued,issued,months,sectors[i],capital,0,capital,0],transaction:tx });
      const creditId=Number(result.insertId), installments:any[]=[];
      for(let n=1;n<=months;n++){
        const interest=Math.round(balance*rate)/100;
        const partCapital=n===months?balance:Math.min(balance,Math.round((monthlyPayment-interest)*100)/100);
        const total=Math.round((partCapital+interest)*100)/100;
        balance=Math.round((balance-partCapital)*100)/100;totalInterest+=interest;
        const [p]:any=await db.query("INSERT INTO pagamentos_credito (tenant_id,credito_id,numero_prestacao,data_vencimento,capital_previsto,juro_previsto,total_previsto,estado) VALUES (?,?,?,DATE_ADD(?,INTERVAL ? MONTH),?,?,?,'Pendente')",{replacements:[tenantId,creditId,n,issued,n,partCapital,interest,total],transaction:tx});
        installments.push({id:Number(p.insertId),number:n,capital:partCapital,interest,total});
      }
      await db.query("UPDATE creditos SET juro_em_divida=?,total_em_divida=?,juros_total=? WHERE tenant_id=? AND id=?",{replacements:[totalInterest,capital+totalInterest,totalInterest,tenantId,creditId],transaction:tx});
      if(i===0){
        for(const number of [1,2]){
          const p=installments[number-1];const date=`2025-${String(10+number-1).padStart(2,'0')}-15`;
          await db.query("UPDATE pagamentos_credito SET capital_pago=?,juro_pago=?,total_pago=?,data_pagamento=?,forma='Dinheiro',estado='Pago' WHERE tenant_id=? AND id=?",{replacements:[p.capital,p.interest,p.total,date,tenantId,p.id],transaction:tx});
          await db.query("INSERT INTO microcredit_payment_events (tenant_id,credito_id,prestacao_id,data_pagamento,capital_pago,juro_pago,forma) VALUES (?,?,?,?,?,?,'Dinheiro')",{replacements:[tenantId,creditId,p.id,date,p.capital,p.interest],transaction:tx});
        }
        await db.query("UPDATE creditos SET capital_em_divida=?,juro_em_divida=?,total_em_divida=?,data_ultimo_pagamento='2025-11-15' WHERE tenant_id=? AND id=?",{replacements:[capital-installments[0].capital-installments[1].capital,totalInterest-installments[0].interest-installments[1].interest,capital+totalInterest-installments[0].total-installments[1].total,tenantId,creditId],transaction:tx});
      }
      if(i>0){
        const due=`2025-${String(10+i%3).padStart(2,'0')}-01`;
        await db.query("UPDATE creditos SET estado='Em_Risco',dias_atraso=?,classe_risco=? WHERE tenant_id=? AND id=?",{replacements:[i===1?15:i===2?60:120,i===1?'I':i===2?'II':'III',tenantId,creditId],transaction:tx});
      }
    }
    await db.query("INSERT INTO fontes_financiamento (tenant_id,tipo,descricao,montante,data_entrada,origem,categoria_periodo) VALUES (?, 'Proprio','Capital de demonstração',500000,'2025-10-01','Seed','Aumento_Capital')",{replacements:[tenantId],transaction:tx});
    for(let month=1;month<=3;month++) await db.query("INSERT INTO movimentos_financeiros_operador (tenant_id,tipo,mes,data,montante) VALUES (?, 'Caixa',?,DATE_ADD('2025-10-01',INTERVAL ? MONTH),?)",{replacements:[tenantId,month,month-1,month*10000],transaction:tx});
    await tx.commit();
    console.log(`Seed isolado criado: ${names.length} clientes, quatro créditos e três meses de movimentos para tenant ${tenantId}.`);
  } catch(error){await tx.rollback();throw error;}
  finally{await db.close();}
};
run().catch(error=>{console.error(error);process.exitCode=1;});
