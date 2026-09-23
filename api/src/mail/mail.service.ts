import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

type MissionLine = { day: string; startTime: string; endTime: string; mission: string };

const BRAND = '#7A291E';

@Injectable()
export class MailService {
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mailpit',
    port: Number(process.env.SMTP_PORT || 1025),
    secure: false,
  });
  private readonly from = 'Salon de la Danse <benevoles@salondeladanse.fr>';

  // Envoi non bloquant : une erreur d'e-mail ne casse jamais le parcours.
  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (e) {
      console.warn('Envoi e-mail échoué :', (e as Error).message);
    }
  }

  private layout(title: string, body: string) {
    return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#2A2724">
      <div style="background:${BRAND};color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
        <div style="font-weight:800;letter-spacing:.5px">SALON DE LA DANSE</div>
        <div style="font-size:12px;opacity:.85">Angers · Espace bénévoles</div>
      </div>
      <div style="border:1px solid #EAE3DF;border-top:0;padding:24px;border-radius:0 0 12px 12px">
        <h2 style="margin:0 0 12px;color:${BRAND}">${title}</h2>
        ${body}
      </div>
    </div>`;
  }

  private missionsTable(missions: MissionLine[]) {
    if (!missions.length) return '<p>Aucun créneau pour le moment.</p>';
    const rows = missions
      .map(
        (m) =>
          `<tr><td style="padding:6px 10px;border-bottom:1px solid #EAE3DF"><b>${m.startTime}–${m.endTime}</b></td>
           <td style="padding:6px 10px;border-bottom:1px solid #EAE3DF">${m.mission}<br><span style="color:#6B6560;font-size:12px">${m.day}</span></td></tr>`,
      )
      .join('');
    return `<table style="width:100%;border-collapse:collapse;margin:12px 0">${rows}</table>`;
  }

  confirmation(to: string, firstName: string) {
    void this.send(
      to,
      'Bienvenue dans l’équipe bénévole 💃',
      this.layout(
        `Bonjour ${firstName},`,
        `<p>Ton compte bénévole est créé. Connecte-toi pour composer ton planning selon tes disponibilités.</p>
         <p>Pense à ajouter ta photo : elle est obligatoire pour ton badge.</p>
         <p>À très vite au Centre de Congrès d'Angers !</p>`,
      ),
    );
  }

  validationRecap(to: string, firstName: string, missions: MissionLine[]) {
    void this.send(
      to,
      'Ton planning est validé ✅',
      this.layout(
        `Merci ${firstName} !`,
        `<p>Ton planning est validé. Voici le récapitulatif de tes missions :</p>
         ${this.missionsTable(missions)}
         <p>Un imprévu ? Contacte l'équipe, seul un administrateur peut modifier un planning validé.</p>`,
      ),
    );
  }

  reminder(to: string, firstName: string, missions: MissionLine[]) {
    void this.send(
      to,
      'J-3 : rappel de tes missions bénévoles',
      this.layout(
        `Bonjour ${firstName},`,
        `<p>Le Salon approche ! Voici un rappel de tes créneaux :</p>
         ${this.missionsTable(missions)}
         <p>Merci pour ton engagement, on compte sur toi.</p>`,
      ),
    );
  }

  passwordReset(to: string, firstName: string, url: string) {
    void this.send(
      to,
      'Réinitialisation de ton mot de passe',
      this.layout(
        `Bonjour ${firstName},`,
        `<p>Tu as demandé à réinitialiser ton mot de passe. Ce lien est valable <b>1 heure</b> :</p>
         <p style="margin:18px 0"><a href="${url}" style="background:${BRAND};color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Choisir un nouveau mot de passe</a></p>
         <p style="color:#6B6560;font-size:13px">Si tu n'es pas à l'origine de cette demande, ignore cet e-mail.</p>`,
      ),
    );
  }
}
