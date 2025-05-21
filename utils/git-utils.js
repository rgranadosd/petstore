const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

function getGitConfig() {
    const configPath = path.join(__dirname, '../config/git-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Reemplazar variables de entorno
    const token = process.env.GITHUB_TOKEN || config.repository.token.replace('${GITHUB_TOKEN}', '');
    
    return {
        ...config.repository,
        token
    };
}

async function createBranchAndPR(score, branchName) {
    try {
        const gitConfig = getGitConfig();
        
        // Configurar Git
        await execPromise(`git config --global user.email "${gitConfig.user}"`);
        await execPromise(`git config --global user.name "API Scoring Bot"`);
        
        // Crear y cambiar a nueva rama
        await execPromise(`git checkout -b ${branchName}`);
        
        // Añadir cambios
        await execPromise('git add .');
        
        // Hacer commit
        await execPromise(`git commit -m "API Score: ${score}"`);
        
        // Configurar el token para el push
        const remoteUrl = `https://${gitConfig.token}@github.com/rgranadosd/petstore.git`;
        await execPromise(`git remote set-url origin ${remoteUrl}`);
        
        // Push a la rama
        await execPromise(`git push origin ${branchName}`);
        
        // Crear PR usando GitHub CLI
        const prTitle = `API Score Update: ${score}`;
        const prBody = `This PR contains updates based on the API score: ${score}`;
        
        await execPromise(`gh pr create --title "${prTitle}" --body "${prBody}" --base main`);
        
        return true;
    } catch (error) {
        console.error('Error creating branch and PR:', error);
        return false;
    }
}

module.exports = {
    createBranchAndPR
}; 