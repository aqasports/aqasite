import { exec } from 'child_process';
import path from 'path';

export const prerender = false;

export async function POST() {
  return new Promise((resolve) => {
    const batPath = path.join(process.cwd(), 'deploy-now.bat');
    // Using '< nul' to bypass the pause command at the end of the bat file
    exec(`"${batPath}" < nul`, (error, stdout, stderr) => {
      if (error) {
        resolve(new Response(JSON.stringify({ 
          success: false, 
          message: error.message, 
          stdout, 
          stderr 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }));
      } else {
        resolve(new Response(JSON.stringify({ 
          success: true, 
          message: 'Déploiement exécuté avec succès !', 
          stdout 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
    });
  });
}
