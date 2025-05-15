*** Settings ***
Documentation    Security testing suite
Library          SeleniumLibrary
Library          RequestsLibrary
Library          Collections
Library          Process
Library          OperatingSystem

*** Variables ***
${BROWSER}        chrome
${URL}            https://demo.example.com
${API_URL}        https://api.example.com
${SECURITY_DIR}   ${CURDIR}/../results/security

*** Test Cases ***
XSS Vulnerability Test
    [Documentation]    Test for Cross-Site Scripting vulnerabilities
    Create Security Reports Directory
    Open Browser    ${URL}    ${BROWSER}
    # Test input fields with XSS payloads
    Input Text    id=username    <script>alert(1)</script>
    Input Password    id=password    password
    Click Button    id=login-button
    
    # Check if script executed (should not)
    ${alert_present}=    Run Keyword And Return Status    Alert Should Be Present
    Should Be Equal    ${alert_present}    ${FALSE}
    
    # Verify input is sanitized in the response
    Page Should Not Contain    <script>alert(1)</script>
    
    # Submit to profile field which might be displayed elsewhere
    Go To    ${URL}/profile
    Input Text    id=bio    <img src="x" onerror="alert(2)">
    Click Button    id=save-profile
    Go To    ${URL}/user/profile
    Page Should Not Contain    onerror="alert(2)"
    [Teardown]    Close Browser

SQL Injection Test
    [Documentation]    Test for SQL Injection vulnerabilities
    Create Session    api_session    ${API_URL}
    # Test SQL injection in user lookup
    ${response}=    GET On Session    api_session    /users/search?q=user' OR '1'='1
    Should Be Equal As Integers    ${response.status_code}    400
    
    # Test SQL injection in login form
    Open Browser    ${URL}    ${BROWSER}
    Input Text    id=username    admin' --
    Input Password    id=password    anything
    Click Button    id=login-button
    Page Should Not Contain    Welcome
    Page Should Contain    Invalid credentials
    [Teardown]    Close Browser

CSRF Protection Test
    [Documentation]    Test for proper CSRF token implementation
    Open Browser    ${URL}    ${BROWSER}
    # Login and get a session
    Input Text    id=username    demo_user
    Input Password    id=password    demo_password
    Click Button    id=login-button
    
    # Verify CSRF token is present in forms
    Go To    ${URL}/profile
    ${csrf_token}=    Get Element Attribute    xpath=//input[@name='csrf_token']    value
    Should Not Be Empty    ${csrf_token}
    
    # Attempt to submit form without CSRF token (using JavaScript)
    Execute JavaScript    
    ...    const tokenInput = document.querySelector('input[name="csrf_token"]');
    ...    if (tokenInput) tokenInput.remove();
    ...    document.querySelector('form').submit();
    
    # Should redirect to error page or show error message
    Page Should Contain    Invalid request
    [Teardown]    Close Browser

Content Security Policy Test
    [Documentation]    Test for proper Content Security Policy implementation
    Open Browser    ${URL}    ${BROWSER}
    ${headers}=    Execute JavaScript    
    ...    return JSON.stringify(performance.getEntriesByType('resource').map(r => ({name: r.name, initiatorType: r.initiatorType})));
    
    Create File    ${SECURITY_DIR}/resource-list.json    ${headers}
    
    # Check if CSP headers are present
    ${response}=    Execute JavaScript    
    ...    return fetch('${URL}').then(r => r.headers.get('content-security-policy') || 'CSP not found');
    
    ${csp_found}=    Run Keyword And Return Status    Should Not Be Equal    ${response}    CSP not found
    Run Keyword If    ${csp_found}    Create File    ${SECURITY_DIR}/csp-header.txt    ${response}
    
    # Test CSP by trying to load inline script
    Execute JavaScript    
    ...    try {
    ...        const script = document.createElement('script');
    ...        script.innerHTML = 'window.scriptExecuted = true;';
    ...        document.body.appendChild(script);
    ...    } catch (e) {
    ...        console.log('CSP blocked script execution');
    ...    }
    
    ${script_executed}=    Execute JavaScript    return window.scriptExecuted === true;
    Should Not Be True    ${script_executed}
    [Teardown]    Close Browser

Sensitive Data Exposure Test
    [Documentation]    Test for sensitive data exposure
    Open Browser    ${URL}    ${BROWSER}
    Input Text    id=username    demo_user
    Input Password    id=password    demo_password
    Click Button    id=login-button
    
    # Check HTTP Response headers
    ${source}=    Get Source
    Create File    ${SECURITY_DIR}/page-source.html    ${source}
    
    # Look for sensitive data patterns
    ${contains_sensitive}=    Run Process    node    ${CURDIR}/../test_scripts/check_sensitive_data.js    ${SECURITY_DIR}/page-source.html
    Should Be Equal As Integers    ${contains_sensitive.rc}    0    Sensitive data found in page source
    [Teardown]    Close Browser

Run Security Scan
    [Documentation]    Run automated security scan
    ${scan_result}=    Run Process    node    ${CURDIR}/../test_scripts/security_scan.js    ${URL}
    Create File    ${SECURITY_DIR}/security-scan-result.json    ${scan_result.stdout}
    Should Be Equal As Integers    ${scan_result.rc}    0    Security vulnerabilities found

*** Keywords ***
Create Security Reports Directory
    Create Directory    ${SECURITY_DIR}