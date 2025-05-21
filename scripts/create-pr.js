#!/usr/bin/env node

const { execSync } = require('child_process');

// Obtener argumentos de la línea de comandos
const [,, score, branchName] = process.argv;

if (!score || !branchName) {
    console.error('Uso: node create-pr.js <score> <branchName>');
    process.exit(1);
}

try {
    // Validar que la nota no sea inadequate
    if (score === 'inadequate') {
        console.error('No se puede crear un PR con una nota inadequate');
        process.exit(1);
    }

    // Guardar cambios locales
    execSync('git stash', { stdio: 'inherit' });

    // Asegurarnos de que estamos en main
    execSync('git checkout main', { stdio: 'inherit' });

    // Intentar actualizar main, pero no fallar si no hay historial común
    try {
        execSync('git pull origin main --allow-unrelated-histories', { stdio: 'inherit' });
    } catch (error) {
        console.log('No hay historial común con el repositorio remoto, continuando...');
    }

    // Crear la rama
    execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });

    // Recuperar cambios locales
    execSync('git stash pop', { stdio: 'inherit' });

    // Hacer commit de los cambios
    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "Fix dependencies for score ${score}"`, { stdio: 'inherit' });

    // Push de la rama
    execSync(`git push -u origin ${branchName}`, { stdio: 'inherit' });

    // Crear el PR
    const prUrl = execSync(
        `gh pr create --title "Fix dependencies for score ${score}" ` +
        `--body "Automated PR to fix dependencies based on score ${score}" ` +
        `--repo rgranadosd/petstore ` +
        `--base main`,
        { encoding: 'utf8' }
    ).trim();

    console.log('PR creado exitosamente:', prUrl);
    process.exit(0);
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
} 