*** Settings ***
Documentation    Accessibility testing suite
Library          SeleniumLibrary
Library          Process
Library          OperatingSystem

*** Variables ***
${BROWSER}       chrome
${URL}           https://demo.example.com
${REPORTS_DIR}   ${CURDIR}/../results/accessibility

*** Test Cases ***
Test Login Page Accessibility
    [Documentation]    Test login page for accessibility compliance
    Create Reports Directory
    Open Browser    ${URL}    ${BROWSER}
    Set Window Size    1920    1080
    Sleep    1s
    Run Accessibility Audit    login-page
    Check For Critical Violations    login-page
    [Teardown]    Close Browser

Test Dashboard Accessibility
    [Documentation]    Test dashboard for accessibility compliance
    Open Browser    ${URL}    ${BROWSER}
    Set Window Size    1920    1080
    Input Text    id=username    demo_user
    Input Password    id=password    demo_password
    Click Button    id=login-button
    Sleep    2s
    Run Accessibility Audit    dashboard
    Check For Critical Violations    dashboard
    [Teardown]    Close Browser

*** Keywords ***
Create Reports Directory
    Create Directory    ${REPORTS_DIR}

Run Accessibility Audit
    [Arguments]    ${page_name}
    Execute JavaScript    
    ...    const axeCore = document.createElement('script');
    ...    axeCore.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.6.3/axe.min.js';
    ...    axeCore.onload = function() {
    ...        axe.run(function(err, results) {
    ...            window.axeResults = results;
    ...            console.log('Accessibility audit complete');
    ...        });
    ...    };
    ...    document.head.appendChild(axeCore);
    
    # Wait for axe to complete
    Sleep    3s
    
    # Get results and save to file
    ${axe_results}=    Execute JavaScript    return JSON.stringify(window.axeResults || {});
    Create File    ${REPORTS_DIR}/${page_name}-a11y-results.json    ${axe_results}

Check For Critical Violations
    [Arguments]    ${page_name}
    ${result}=    Run Process    node    ${CURDIR}/../test_scripts/check_a11y_violations.js    ${REPORTS_DIR}/${page_name}-a11y-results.json
    Should Be Equal As Integers    ${result.rc}    0    Critical accessibility violations found