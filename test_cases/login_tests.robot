*** Settings ***
Documentation    Example test case for a web application login functionality
Library          SeleniumLibrary
Library          OperatingSystem

*** Variables ***
${BROWSER}       chrome
${URL}           https://demo.example.com
${USERNAME}      demo_user
${PASSWORD}      demo_password

*** Test Cases ***
Valid Login
    [Documentation]    Test login with valid credentials
    Open Browser    ${URL}    ${BROWSER}
    Input Text    id=username    ${USERNAME}
    Input Password    id=password    ${PASSWORD}
    Click Button    id=login-button
    Page Should Contain    Welcome
    [Teardown]    Close Browser

Invalid Login
    [Documentation]    Test login with invalid credentials
    Open Browser    ${URL}    ${BROWSER}
    Input Text    id=username    invalid_user
    Input Password    id=password    invalid_password
    Click Button    id=login-button
    Page Should Contain    Invalid credentials
    [Teardown]    Close Browser

*** Keywords ***
Reset Application
    [Documentation]    Reset the application to a known state
    # Implementation would depend on the specific application