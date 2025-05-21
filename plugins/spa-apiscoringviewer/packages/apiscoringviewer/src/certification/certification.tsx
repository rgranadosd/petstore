// packages/apiscoringviewer/src/certification/certification.tsx
// SPDX-FileCopyrightText: 2023 Industria de Diseño Textil S.A. INDITEX
//
// SPDX-License-Identifier: Apache-2.0

import "./certification.css";
import ApiTabs from "./components/api-tabs";
import { useState, type ComponentType, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { FormattedMessage } from "react-intl";
import { Button, Center, Loader } from "@mantine/core";
import isIntelliJ from "../utils/is-intellij";
import defaultGetApiIdentifier from "./utils/get-api-identifier";
import Feedback from "../components/feedback";
import IndicatorRadar from "../components/IndicatorRadar";
import { createBranchAndPR } from '../../../utils/git-utils';

import type {
  ApiIdentifier,
  DataProviderChildFn,
  GetApiIdentifier,
  ModuleMetadata,
  Certification,
  CodeValidation,
  DocValidation,
} from "../types";

function ErrorFallback() {
  return (
    <Center w="100%">
      <FormattedMessage id="certification.unexpected-error" defaultMessage="Unexpected error" />
    </Center>
  );
}

type DataProviderType<TApiIdentifier extends ApiIdentifier> = ComponentType<{
  children: DataProviderChildFn<TApiIdentifier>;
}>;

type CertificationProps<TApiIdentifier extends ApiIdentifier> = {
  DataProvider: DataProviderType<TApiIdentifier>;
  getApiIdentifier?: GetApiIdentifier<TApiIdentifier>;
};

type ValidationResult = {
  designValidation?: CodeValidation;
  securityValidation?: CodeValidation;
  documentationValidation?: DocValidation;
};

export default function CertificationPage<
  TApiIdentifier extends ApiIdentifier = ApiIdentifier,
>({
  DataProvider,
  getApiIdentifier = defaultGetApiIdentifier,
}: Readonly<CertificationProps<TApiIdentifier>>) {
  const [intelliJLoading, setIntelliJLoading] = useState(false);
  const [scores, setScores] = useState({
    design: 0,
    security: 0,
    documentation: 0
  });
  
  // Estados para los desplegables
  const [openDesignDetails, setOpenDesignDetails] = useState(false);
  const [openSecurityDetails, setOpenSecurityDetails] = useState(false);
  const [openDocDetails, setOpenDocDetails] = useState(false);
  
  // Estados para almacenar los problemas reales extraídos de los datos
  const [designIssues, setDesignIssues] = useState<any[]>([]);
  const [securityIssues, setSecurityIssues] = useState<any[]>([]);
  const [documentationIssues, setDocumentationIssues] = useState<any[]>([]);
  
  // Contadores para los tipos de problemas
  const [designCounts, setDesignCounts] = useState({ errors: 0, warnings: 0, info: 0 });
  const [securityCounts, setSecurityCounts] = useState({ errors: 0, warnings: 0, info: 0 });
  const [documentationCounts, setDocumentationCounts] = useState({ errors: 0, warnings: 0, info: 0 });
  
  function toggleDetails(type: 'design' | 'security' | 'doc') {
    if (type === 'design') {
      setOpenDesignDetails(!openDesignDetails);
    } else if (type === 'security') {
      setOpenSecurityDetails(!openSecurityDetails);
    } else {
      setOpenDocDetails(!openDocDetails);
    }
  }
  
  // Componente para mostrar cada detalle con formato
  const DetailItem = ({ item }: { item: any }) => (
    <div style={{
      padding: '10px 15px',
      marginBottom: '10px',
      backgroundColor: item.type === 'error' ? 'rgba(244, 67, 54, 0.1)' : 
                        item.type === 'warning' ? 'rgba(255, 152, 0, 0.1)' : 
                        'rgba(33, 150, 243, 0.1)',
      borderLeft: `4px solid ${item.type === 'error' ? '#f44336' : 
                              item.type === 'warning' ? '#ff9800' : 
                              '#2196f3'}`,
      borderRadius: '2px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '5px'
      }}>
        <span style={{
          fontWeight: 'bold',
          color: item.type === 'error' ? '#f44336' : 
                 item.type === 'warning' ? '#ff9800' : 
                 '#2196f3'
        }}>{item.code}: {item.message}</span>
        <span style={{
          fontSize: '12px',
          color: '#aaa',
          padding: '2px 6px',
          backgroundColor: '#333',
          borderRadius: '4px'
        }}>{item.location}</span>
      </div>
      <div style={{
        fontSize: '13px',
        color: '#ccc',
        marginTop: '5px'
      }}>{item.description}</div>
    </div>
  );

  function onClick() {
    window.cefQuery({
      request: JSON.stringify({
        request: "submitCertificationIntelliJ",
      }),
    });
    setIntelliJLoading(true);
  }

  // Añadir antes del useEffect o al inicio del componente
  function getValidation(resultArr: any[], key: string) {
    const found = resultArr.find((r: any) => key in r);
    return found ? found[key] : undefined;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <DataProvider>
        {({
          certification,
          loading,
          error,
          modulesMetadata,
          apisRevalidationMetadata,
          revalidateModule,
          revalidateApi,
        }) => {
          const showTriggerButton =
            !certification && !intelliJLoading && isIntelliJ();

          // Debug: Imprimir toda la estructura de datos
          console.log('Datos completos recibidos:', {
            certification: JSON.stringify(certification, null, 2),
            modulesMetadata: JSON.stringify(modulesMetadata, null, 2),
            apisRevalidationMetadata: JSON.stringify(apisRevalidationMetadata, null, 2)
          });

          useEffect(() => {
            console.log('useEffect triggered with certification:', certification);
            
            if (certification) {
              // Utilizamos casting para evitar errores de TypeScript
              const certAny = certification as any;
              console.log('Datos de certification:', {
                apis: certAny.apis,
                results: certification.results,
                rootPath: certification.rootPath,
                score: certAny.score,
                metadata: certification.metadata
              });
            }

            let newScores = {
              design: 0,
              security: 0,
              documentation: 0
            };

            let design: any = undefined;
            let security: any = undefined;
            let documentation: any = undefined;
            if (certification?.results && Array.isArray(certification.results) && certification.results.length > 0) {
              const result = certification.results[0];
              design = getValidation(result.result, 'designValidation');
              security = getValidation(result.result, 'securityValidation');
              documentation = getValidation(result.result, 'documentationValidation');

              newScores.design = typeof design?.score === 'number' ? design.score : 0;
              newScores.security = typeof security?.score === 'number' ? security.score : 0;
              newScores.documentation = typeof documentation?.score === 'number' ? documentation.score : 0;
            }

            // Si no hay scores individuales, usar el global
            if (newScores.design === 0 && newScores.security === 0 && newScores.documentation === 0) {
              if (certification?.results?.[0]?.score) {
                const globalScore = Number(certification.results[0].score);
                newScores = {
                  design: globalScore,
                  security: globalScore,
                  documentation: globalScore
                };
                console.log('Usando score global:', globalScore);
              }
            }

            // Listas para almacenar problemas encontrados
            let designIssuesList: any[] = [];
            let securityIssuesList: any[] = [];
            let documentationIssuesList: any[] = [];

            // Extraer issues de validationIssues para cada módulo
            if (design && Array.isArray(design.validationIssues)) {
              designIssuesList = [
                ...design.validationIssues.map((issue: any) => ({
                  type: (issue.severity || 'error').toLowerCase() === 'warn' ? 'warning' : (issue.severity || 'error').toLowerCase(),
                  code: issue.code || 'D',
                  message: issue.message || 'Design problem',
                  location: issue.fileName || 'Unknown',
                  description: issue.message || 'No description available'
                }))
              ];
            }
            if (security && Array.isArray(security.validationIssues)) {
              securityIssuesList = [
                ...security.validationIssues.map((issue: any) => ({
                  type: (issue.severity || 'error').toLowerCase() === 'warn' ? 'warning' : (issue.severity || 'error').toLowerCase(),
                  code: issue.code || 'S',
                  message: issue.message || 'Security problem',
                  location: issue.fileName || 'Unknown',
                  description: issue.message || 'No description available'
                }))
              ];
            }
            if (documentation && Array.isArray(documentation.validationIssues)) {
              documentationIssuesList = [
                ...documentation.validationIssues.map((issue: any) => ({
                  type: (issue.severity || 'error').toLowerCase() === 'warn' ? 'warning' : (issue.severity || 'error').toLowerCase(),
                  code: issue.code || 'DOC',
                  message: issue.message || 'Documentation problem',
                  location: issue.fileName || 'Unknown',
                  description: issue.message || 'No description available'
                }))
              ];
            }

            // Verificamos si hay un score global en la certificación
            if (certification) {
              const certAny = certification as any;
              if (certAny.score) {
                console.log('Score global encontrado:', certAny.score);
              }
            }

            // Probamos varios patrones de estructura para encontrar los scores
            if (certification?.results && Array.isArray(certification.results) && certification.results.length > 0) {
              console.log('Estructura de primer resultado:', JSON.stringify(certification.results[0], null, 2));
              
              certification.results.forEach((result: any, index: number) => {
                console.log(`Analizando resultado ${index}:`, result);
                
                // Intentamos extraer puntajes directamente del result
                if (result.score) {
                  console.log('Score encontrado en result:', result.score);
                }
                
                // Extraer scores y problemas de diseño
                if (result.designValidation) {
                  if (result.designValidation.score !== undefined) {
                    const score = Number(result.designValidation.score);
                    newScores.design = Math.max(newScores.design, score);
                    console.log('Score de diseño:', score);
                  }
                  
                  if (result.designValidation.issues && Array.isArray(result.designValidation.issues)) {
                    designIssuesList = [...designIssuesList, ...result.designValidation.issues.map((issue: any) => ({
                      type: issue.severity || 'error',
                      code: issue.code || `D${index}`,
                      message: issue.message || 'Design problem',
                      location: issue.location || 'Unknown',
                      description: issue.description || issue.message || 'No description available'
                    }))];
                  }
                }
                
                // Extraer scores y problemas de seguridad
                if (result.securityValidation) {
                  if (result.securityValidation.score !== undefined) {
                    const score = Number(result.securityValidation.score);
                    newScores.security = Math.max(newScores.security, score);
                    console.log('Score de seguridad:', score);
                  }
                  
                  if (result.securityValidation.issues && Array.isArray(result.securityValidation.issues)) {
                    securityIssuesList = [...securityIssuesList, ...result.securityValidation.issues.map((issue: any) => ({
                      type: issue.severity || 'error',
                      code: issue.code || `S${index}`,
                      message: issue.message || 'Security problem',
                      location: issue.location || 'Unknown',
                      description: issue.description || issue.message || 'No description available'
                    }))];
                  }
                }
                
                // Extraer scores y problemas de documentación
                if (result.documentationValidation) {
                  if (result.documentationValidation.score !== undefined) {
                    const score = Number(result.documentationValidation.score);
                    newScores.documentation = Math.max(newScores.documentation, score);
                    console.log('Score de documentación:', score);
                  }
                  
                  if (result.documentationValidation.issues && Array.isArray(result.documentationValidation.issues)) {
                    documentationIssuesList = [...documentationIssuesList, ...result.documentationValidation.issues.map((issue: any) => ({
                      type: issue.severity || 'error',
                      code: issue.code || `DOC${index}`,
                      message: issue.message || 'Documentation problem',
                      location: issue.location || 'Unknown',
                      description: issue.description || issue.message || 'No description available'
                    }))];
                  }
                }
                
                // Buscar en validationResults si existe
                if (result.validationResults && Array.isArray(result.validationResults)) {
                  result.validationResults.forEach((validationResult: any) => {
                    if (validationResult.type?.toLowerCase() === 'design') {
                      if (validationResult.score !== undefined) {
                        const score = Number(validationResult.score);
                        newScores.design = Math.max(newScores.design, score);
                        console.log('Score de diseño desde validationResults:', score);
                      }
                      
                      if (validationResult.issues && Array.isArray(validationResult.issues)) {
                        designIssuesList = [...designIssuesList, ...validationResult.issues.map((issue: any) => ({
                          type: issue.severity || 'error',
                          code: issue.code || 'D-VAL',
                          message: issue.message || 'Design problem',
                          location: issue.location || 'Unknown',
                          description: issue.description || issue.message || 'No description available'
                        }))];
                      }
                    } else if (validationResult.type?.toLowerCase() === 'security') {
                      if (validationResult.score !== undefined) {
                        const score = Number(validationResult.score);
                        newScores.security = Math.max(newScores.security, score);
                        console.log('Score de seguridad desde validationResults:', score);
                      }
                      
                      if (validationResult.issues && Array.isArray(validationResult.issues)) {
                        securityIssuesList = [...securityIssuesList, ...validationResult.issues.map((issue: any) => ({
                          type: issue.severity || 'error',
                          code: issue.code || 'S-VAL',
                          message: issue.message || 'Security problem',
                          location: issue.location || 'Unknown',
                          description: issue.description || issue.message || 'No description available'
                        }))];
                      }
                    } else if (validationResult.type?.toLowerCase() === 'documentation') {
                      if (validationResult.score !== undefined) {
                        const score = Number(validationResult.score);
                        newScores.documentation = Math.max(newScores.documentation, score);
                        console.log('Score de documentación desde validationResults:', score);
                      }
                      
                      if (validationResult.issues && Array.isArray(validationResult.issues)) {
                        documentationIssuesList = [...documentationIssuesList, ...validationResult.issues.map((issue: any) => ({
                          type: issue.severity || 'error',
                          code: issue.code || 'DOC-VAL',
                          message: issue.message || 'Documentation problem',
                          location: issue.location || 'Unknown',
                          description: issue.description || issue.message || 'No description available'
                        }))];
                      }
                    }
                  });
                }
              });
            } else if (modulesMetadata) {
              console.log('Usando modulesMetadata:', JSON.stringify(modulesMetadata, null, 2));
              
              const modules = Array.isArray(modulesMetadata)
                ? modulesMetadata
                : Object.values(modulesMetadata || {});

              modules.forEach((module: any) => {
                console.log('Procesando módulo:', JSON.stringify(module, null, 2));
                
                if (module?.score !== undefined) {
                  console.log('Score encontrado en módulo:', module.score);
                  console.log('ID/type de módulo:', module.id || module.type);
                }
                
                // Extraemos los scores dependiendo de id o type
                if (module?.id?.toLowerCase() === "design" || module?.type?.toLowerCase() === "design") {
                  const score = Number(module.score || 0);
                  newScores.design = Math.max(newScores.design, score);
                  console.log('Score de diseño actualizado desde módulo:', score);
                }
                
                if (module?.id?.toLowerCase() === "security" || module?.type?.toLowerCase() === "security") {
                  const score = Number(module.score || 0);
                  newScores.security = Math.max(newScores.security, score);
                  console.log('Score de seguridad actualizado desde módulo:', score);
                }
                
                if (module?.id?.toLowerCase() === "documentation" || module?.type?.toLowerCase() === "documentation") {
                  const score = Number(module.score || 0);
                  newScores.documentation = Math.max(newScores.documentation, score);
                  console.log('Score de documentación actualizado desde módulo:', score);
                }
              });
            }

            // Si no encontramos scores, usamos valores por defecto para mantener la UI funcional
            if (newScores.design === 0 && newScores.security === 0 && newScores.documentation === 0) {
              // En lugar de usar valores hardcodeados, intentamos extraer los scores de otras fuentes
              if (certification?.results?.[0]?.score) {
                const globalScore = Number(certification.results[0].score);
                newScores = {
                  design: globalScore,
                  security: globalScore,
                  documentation: globalScore
                };
                console.log('Usando score global:', globalScore);
              } else if (modulesMetadata) {
                // Intentar extraer scores de modulesMetadata
                const modules = Array.isArray(modulesMetadata) ? modulesMetadata : Object.values(modulesMetadata || {});
                modules.forEach((module: any) => {
                  if (module?.score !== undefined) {
                    const score = Number(module.score);
                    if (module?.id?.toLowerCase() === "design" || module?.type?.toLowerCase() === "design") {
                      newScores.design = score;
                    } else if (module?.id?.toLowerCase() === "security" || module?.type?.toLowerCase() === "security") {
                      newScores.security = score;
                    } else if (module?.id?.toLowerCase() === "documentation" || module?.type?.toLowerCase() === "documentation") {
                      newScores.documentation = score;
                    }
                  }
                });
              }
            }

            console.log('Scores finales calculados:', newScores);
            setScores(newScores);
            
            // Actualizar los issues encontrados
            console.log('Problemas de diseño encontrados:', designIssuesList.length);
            console.log('Problemas de seguridad encontrados:', securityIssuesList.length);
            console.log('Problemas de documentación encontrados:', documentationIssuesList.length);
            
            // Si no encontramos problemas específicos, mostramos un mensaje genérico
            if (designIssuesList.length === 0) {
              designIssuesList = [{
                type: 'info',
                code: 'NO-ISSUES',
                message: 'No design issues found',
                location: 'general',
                description: 'No specific design issues detected in the API.'
              }];
            }
            
            if (securityIssuesList.length === 0) {
              securityIssuesList = [{
                type: 'info',
                code: 'NO-ISSUES',
                message: 'No security issues found',
                location: 'general',
                description: 'No specific security issues detected in the API.'
              }];
            }
            
            if (documentationIssuesList.length === 0) {
              documentationIssuesList = [{
                type: 'info',
                code: 'NO-ISSUES',
                message: 'No documentation issues found',
                location: 'general',
                description: 'No specific documentation issues detected in the API.'
              }];
            }
            
            // Contar tipos de problemas
            const designCounts = {
              errors: designIssuesList.filter(issue => issue.type === 'error').length,
              warnings: designIssuesList.filter(issue => issue.type === 'warning').length,
              info: designIssuesList.filter(issue => issue.type === 'info').length
            };
            
            const securityCounts = {
              errors: securityIssuesList.filter(issue => issue.type === 'error').length,
              warnings: securityIssuesList.filter(issue => issue.type === 'warning').length,
              info: securityIssuesList.filter(issue => issue.type === 'info').length
            };
            
            const documentationCounts = {
              errors: documentationIssuesList.filter(issue => issue.type === 'error').length,
              warnings: documentationIssuesList.filter(issue => issue.type === 'warning').length,
              info: documentationIssuesList.filter(issue => issue.type === 'info').length
            };
            
            // Actualizar estados
            setDesignIssues(designIssuesList);
            setSecurityIssues(securityIssuesList);
            setDocumentationIssues(documentationIssuesList);
            setDesignCounts(designCounts);
            setSecurityCounts(securityCounts);
            setDocumentationCounts(documentationCounts);
            
          }, [certification, modulesMetadata]);

          // Registrar datos para depuración
          useEffect(() => {
            console.log("[DEBUG] Certification:", certification);
            console.log("[DEBUG] ModulesMetadata:", modulesMetadata);

            // Log detallado de la estructura necesaria para ApiTabs
            if (certification) {
              console.log("[DEBUG] Estructura de APIs:", certification.results);
              console.log("[DEBUG] Metadata APIs:", certification.metadata?.apis);
              console.log("[DEBUG] Root Path:", certification.rootPath);
              
              // Verificar si hay resultados
              if (certification.results && certification.results.length > 0) {
                certification.results.forEach((api, index) => {
                  console.log(`[DEBUG] API #${index}:`, api);
                  console.log(`[DEBUG] API #${index} Result:`, api.result);
                });
              } else {
                console.error("[DEBUG] No hay resultados en certification.results");
              }
            }
          }, [certification, modulesMetadata]);

          return (
            <>
              {showTriggerButton && (
                <Center w="100%">
                  <Button onClick={onClick} color="dark">
                    Trigger Certification
                  </Button>
                </Center>
              )}

              {certification && (
                <div style={{ width: '100%' }}>
                  {/* Cabecera personalizada */}
                  <div style={{
                    width: '100%',
                    textAlign: 'left',
                    marginBottom: 0,
                    paddingBottom: 0,
                    paddingTop: 0,
                  }}>
                    <span style={{
                      color: '#ffab00',
                      fontWeight: 'bold',
                      fontSize: '1.1em',
                      letterSpacing: '2px',
                      textTransform: 'uppercase',
                    }}>
                      API SCORING by APICURIOS
                    </span>
                    <div style={{
                      color: '#999',
                      fontSize: '0.85em',
                      marginTop: '3px',
                    }}>
                      Analysis date: {new Date().toLocaleString()}
                    </div>
                  </div>
                  {/* Primera fila: título, valoración global y radar */}
                  <div style={{ 
                    display: 'flex', 
                    width: '100%',
                    marginBottom: 0,
                    marginTop: 5,
                    gap: '8px',
                    alignItems: 'flex-start'
                  }}>
                    {/* Título y valoración global */}
                    <div style={{ flex: '1 1 auto' }}>
                      <h2 style={{ color: 'white', marginTop: 0, marginBottom: 10 }}>
                        {certification?.results?.[0]?.apiName || 'API'}
                        {(certification as any).score && (
                          <span style={{ 
                            marginLeft: '15px', 
                            backgroundColor: '#444', 
                            padding: '3px 10px', 
                            borderRadius: '4px',
                            fontSize: '0.9em'
                          }}>
                            {(certification as any).score}% Quality
                          </span>
                        )}
                      </h2>
                      <p>
                        {(() => {
                          const ratingDescription = certification?.results?.[0]?.ratingDescription || 'General API quality assessment based on design, security, and documentation.';
                          if (ratingDescription.toLowerCase().includes('inadequate')) {
                            return <span style={{ color: '#f44336', fontWeight: 'bold' }}>{ratingDescription}</span>;
                          } else if (ratingDescription.toLowerCase().includes('good') || ratingDescription.toLowerCase().includes('adequate')) {
                            return <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{ratingDescription}</span>;
                          } else {
                            return <span style={{ color: '#ccc' }}>{ratingDescription}</span>;
                          }
                        })()}
                      </p>
                      {!certification?.results?.[0]?.ratingDescription?.toLowerCase().includes('inadequate') && (
                        <button
                          onClick={async () => {
                            try {
                              const apiName = certification?.results?.[0]?.apiName || 'api-update';
                              const branchName = `api-scoring-${apiName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
                              
                              // Generate detailed PR description
                              const score = certification?.results?.[0]?.score || 0;
                              const designScore = scores.design.toFixed(2);
                              const securityScore = scores.security.toFixed(2);
                              const docScore = scores.documentation.toFixed(2);
                              
                              const prTitle = `API Scoring Update: ${apiName} (Score: ${score})`;
                              const prBody = `## API Scoring Results

### Overall Score: ${score}

### Detailed Scores:
- Design: ${designScore}%
- Security: ${securityScore}%
- Documentation: ${docScore}%

### Design Assessment:
${(() => {
  const designValidation = certification?.results?.[0]?.result?.find(r => 'designValidation' in r) as { designValidation: CodeValidation };
  return designValidation?.designValidation?.ratingDescription || 'No design validation results available.';
})()}

### Security Assessment:
${(() => {
  const securityValidation = certification?.results?.[0]?.result?.find(r => 'securityValidation' in r) as { securityValidation: CodeValidation };
  return securityValidation?.securityValidation?.ratingDescription || 'No security validation results available.';
})()}

### Documentation Assessment:
${(() => {
  const docValidation = certification?.results?.[0]?.result?.find(r => 'documentationValidation' in r) as { documentationValidation: DocValidation };
  return docValidation?.documentationValidation?.ratingDescription || 'No documentation validation results available.';
})()}

This PR contains updates based on the API scoring results.`;

                              const success = await createBranchAndPR(score, branchName, prTitle, prBody);
                              
                              if (success) {
                                alert('Branch and PR created successfully!');
                              } else {
                                alert('Failed to create branch and PR. Please check the console for details.');
                              }
                            } catch (error) {
                              console.error('Error creating branch and PR:', error);
                              alert('An error occurred while creating the branch and PR.');
                            }
                          }}
                          style={{
                            backgroundColor: '#4caf50',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginTop: '10px',
                            fontWeight: 'bold'
                          }}
                        >
                          Push to GIT
                        </button>
                      )}
                    </div>
                    
                    {/* Gráfico radar */}
                    <div style={{ flex: '0 0 350px' }}>
                      <IndicatorRadar
                        design={scores.design}
                        security={scores.security}
                        documentation={scores.documentation}
                      />
                    </div>
                  </div>
                  
                  {/* Segunda fila: detalles de los módulos con ApiTabs original */}
                  <div style={{ 
                    width: '100%',
                    marginTop: 0,
                    paddingTop: 0,
                    minHeight: '300px'
                  }}>
                    {/* IMPLEMENTACIÓN ULTRA SIMPLE CON COLLAPSABLES */}
                    <div style={{
                      margin: '20px 0',
                      padding: '20px',
                      backgroundColor: '#222',
                      border: '2px solid #ffab00',
                      color: 'white',
                      borderRadius: '4px'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }} onClick={() => toggleDetails('design')}>
                        <h2 style={{margin: '0 0 15px 0', color: '#ffab00'}}>DESIGN: {scores.design.toFixed(2)}%</h2>
                        <span style={{fontSize: '24px', color: '#ffab00'}}>{openDesignDetails ? '▼' : '▶'}</span>
                      </div>
                      <div style={{fontSize: '14px', lineHeight: '1.5'}}>
                        <p>
                          {(() => {
                            const ratingDescription = (certification?.results?.[0]?.result?.find(r => 'designValidation' in r) as { designValidation: CodeValidation })?.designValidation?.ratingDescription || 'Assessment of API design practices according to industry standards.';
                            if (ratingDescription.toLowerCase().includes('inadequate')) {
                              return <span style={{ color: '#f44336', fontWeight: 'bold' }}>{ratingDescription}</span>;
                            } else if (ratingDescription.toLowerCase().includes('good') || ratingDescription.toLowerCase().includes('adequate')) {
                              return <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{ratingDescription}</span>;
                            } else {
                              return ratingDescription;
                            }
                          })()}
                        </p>
                        {designIssues.length > 0 && (
                          <ul style={{paddingLeft: '20px', marginTop: '10px'}}>
                            {designIssues.slice(0, 3).map((issue, index) => (
                              <li key={index}>
                                {issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : '✅'} {issue.message}
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {/* Detalles expandibles */}
                        {openDesignDetails && (
                          <div style={{
                            marginTop: '15px',
                            padding: '10px 15px',
                            backgroundColor: '#1a1a1a',
                            borderRadius: '4px'
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: '10px'
                            }}>
                              <h3 style={{margin: '0', fontSize: '16px', color: '#ddd'}}>Full details</h3>
                              <div>
                                {designCounts.errors > 0 && (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    backgroundColor: '#f44336',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    marginRight: '5px'
                                  }}>{designCounts.errors} Errors</span>
                                )}
                                {designCounts.warnings > 0 && (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    backgroundColor: '#ff9800',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    marginRight: '5px'
                                  }}>{designCounts.warnings} Warnings</span>
                                )}
                                {designCounts.info > 0 && (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    backgroundColor: '#2196f3',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                  }}>{designCounts.info} Info</span>
                                )}
                              </div>
                            </div>
                            
                            <div style={{marginTop: '15px'}}>
                              {designIssues.map((item, index) => (
                                <DetailItem key={`design-${index}`} item={item} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{
                      margin: '20px 0',
                      padding: '20px',
                      backgroundColor: '#222',
                      border: '2px solid #ffab00',
                      color: 'white',
                      borderRadius: '4px'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }} onClick={() => toggleDetails('security')}>
                        <h2 style={{margin: '0 0 15px 0', color: '#ffab00'}}>SECURITY: {scores.security.toFixed(2)}%</h2>
                        <span style={{fontSize: '24px', color: '#ffab00'}}>{openSecurityDetails ? '▼' : '▶'}</span>
                      </div>
                      <div style={{fontSize: '14px', lineHeight: '1.5'}}>
                        <p>
                          {(() => {
                            const ratingDescription = (certification?.results?.[0]?.result?.find(r => 'securityValidation' in r) as { securityValidation: CodeValidation })?.securityValidation?.ratingDescription || 'Security analysis: authentication, authorization, and secure practices.';
                            if (ratingDescription.toLowerCase().includes('inadequate')) {
                              return <span style={{ color: '#f44336', fontWeight: 'bold' }}>{ratingDescription}</span>;
                            } else if (ratingDescription.toLowerCase().includes('good') || ratingDescription.toLowerCase().includes('adequate')) {
                              return <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{ratingDescription}</span>;
                            } else {
                              return ratingDescription;
                            }
                          })()}
                        </p>
                        {securityIssues.length > 0 && (
                          <ul style={{paddingLeft: '20px', marginTop: '10px'}}>
                            {securityIssues.slice(0, 3).map((issue, index) => (
                              <li key={index}>
                                {issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : '✅'} {issue.message}
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {/* Detalles expandibles */}
                        {openSecurityDetails && (
                          <div style={{
                            marginTop: '15px',
                            padding: '10px 15px',
                            backgroundColor: '#1a1a1a',
                            borderRadius: '4px'
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: '10px'
                            }}>
                              <h3 style={{margin: '0', fontSize: '16px', color: '#ddd'}}>Full details</h3>
                              <div>
                                {securityCounts.errors > 0 && (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    backgroundColor: '#f44336',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    marginRight: '5px'
                                  }}>{securityCounts.errors} Errors</span>
                                )}
                                {securityCounts.warnings > 0 && (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    backgroundColor: '#ff9800',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    marginRight: '5px'
                                  }}>{securityCounts.warnings} Warnings</span>
                                )}
                                {securityCounts.info > 0 && (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    backgroundColor: '#2196f3',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                  }}>{securityCounts.info} Info</span>
                                )}
                              </div>
                            </div>
                            
                            <div style={{marginTop: '15px'}}>
                              {securityIssues.map((item, index) => (
                                <DetailItem key={`security-${index}`} item={item} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{
                      margin: '20px 0',
                      padding: '20px',
                      backgroundColor: '#222',
                      border: '2px solid #ffab00',
                      color: 'white',
                      borderRadius: '4px'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }} onClick={() => toggleDetails('doc')}>
                        <h2 style={{margin: '0 0 15px 0', color: '#ffab00'}}>DOCUMENTATION: {scores.documentation.toFixed(2)}%</h2>
                        <span style={{fontSize: '24px', color: '#ffab00'}}>{openDocDetails ? '▼' : '▶'}</span>
                      </div>
                      <div style={{fontSize: '14px', lineHeight: '1.5'}}>
                        <p>
                          {(() => {
                            const ratingDescription = (certification?.results?.[0]?.result?.find(r => 'documentationValidation' in r) as { documentationValidation: DocValidation })?.documentationValidation?.ratingDescription || 'Documentation completeness and quality assessment.';
                            if (ratingDescription.toLowerCase().includes('inadequate')) {
                              return <span style={{ color: '#f44336', fontWeight: 'bold' }}>{ratingDescription}</span>;
                            } else if (ratingDescription.toLowerCase().includes('good') || ratingDescription.toLowerCase().includes('adequate')) {
                              return <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{ratingDescription}</span>;
                            } else {
                              return ratingDescription;
                            }
                          })()}
                        </p>
                        {documentationIssues.length > 0 && (
                          <ul style={{paddingLeft: '20px', marginTop: '10px'}}>
                            {documentationIssues.slice(0, 3).map((issue, index) => (
                              <li key={index}>
                                {issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : '✅'} {issue.message}
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {/* Detalles expandibles */}
                        {openDocDetails && (
                          <div style={{
                            marginTop: '15px',
                            padding: '10px 15px',
                            backgroundColor: '#1a1a1a',
                            borderRadius: '4px'
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: '10px'
                            }}>
                              <h3 style={{margin: '0', fontSize: '16px', color: '#ddd'}}>Full details</h3>
                              <div>
                                {documentationCounts.errors > 0 && (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    backgroundColor: '#f44336',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    marginRight: '5px'
                                  }}>{documentationCounts.errors} Errors</span>
                                )}
                                {documentationCounts.warnings > 0 && (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    backgroundColor: '#ff9800',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    marginRight: '5px'
                                  }}>{documentationCounts.warnings} Warnings</span>
                                )}
                                {documentationCounts.info > 0 && (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    backgroundColor: '#2196f3',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                  }}>{documentationCounts.info} Info</span>
                                )}
                              </div>
                            </div>
                            
                            <div style={{marginTop: '15px'}}>
                              {documentationIssues.map((item, index) => (
                                <DetailItem key={`doc-${index}`} item={item} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* ApiTabs original oculto */}
                    <div style={{ display: 'none' }}>
                      <ApiTabs
                        getApiIdentifier={getApiIdentifier}
                        certification={certification}
                        modulesMetadata={modulesMetadata}
                        apisRevalidationMetadata={apisRevalidationMetadata}
                        revalidateModule={revalidateModule}
                        revalidateApi={revalidateApi}
                      />
                    </div>
                  </div>
                </div>
              )}

              {(loading || intelliJLoading) && (
                <Center w="100%">
                  <Loader
                    color="gray"
                    size="lg"
                    data-testid="Certification-Loading"
                  />
                </Center>
              )}

              {error && (
                <Feedback.Error
                  fullHeight
                  mainText={
                    <FormattedMessage id="certification.network-error" defaultMessage="Network error" />
                  }
                  data-testid="CertificationPage-NetworkError"
                />
              )}
            </>
          );
        }}
      </DataProvider>
    </ErrorBoundary>
  );
}
