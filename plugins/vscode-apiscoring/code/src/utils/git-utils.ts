import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function createBranchAndPR(score: number | string, branchName: string): Promise<boolean> {
    try {
        // Validar que la nota no sea inadequate
        if (score === 'inadequate') {
            vscode.window.showErrorMessage('No se puede crear un PR con una nota inadequate');
            return false;
        }

        // Obtener el workspace actual
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No hay un workspace abierto');
            return false;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;

        // Crear y cambiar a nueva rama
        await execPromise(`git checkout -b ${branchName}`, { cwd: workspaceRoot });
        
        // Añadir cambios
        await execPromise('git add .', { cwd: workspaceRoot });
        
        // Hacer commit
        await execPromise(`git commit -m "API Score: ${score}"`, { cwd: workspaceRoot });
        
        // Push a la rama
        await execPromise(`git push origin ${branchName}`, { cwd: workspaceRoot });
        
        // Crear PR usando GitHub CLI
        const prTitle = `API Score Update: ${score}`;
        const prBody = `This PR contains updates based on the API score: ${score}`;
        
        const { stdout: prUrl } = await execPromise(
            `gh pr create --title "${prTitle}" --body "${prBody}" --base main`,
            { cwd: workspaceRoot }
        );

        // Mostrar mensaje de éxito
        vscode.window.showInformationMessage(`PR creado exitosamente: ${prUrl.trim()}`);
        
        // Abrir el PR en el navegador
        vscode.env.openExternal(vscode.Uri.parse(prUrl.trim()));
        
        return true;
    } catch (error) {
        console.error('Error creating branch and PR:', error);
        vscode.window.showErrorMessage(`No se pudo crear el PR: ${error.message}`);
        return false;
    }
} 