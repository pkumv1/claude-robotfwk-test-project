*** Settings ***
Documentation    Visual regression testing suite
Library          SeleniumLibrary
Library          OperatingSystem
Library          Collections

*** Variables ***
${BROWSER}       chrome
${URL}           https://demo.example.com
${SCREENSHOT_DIR}    ${CURDIR}/../results/visual

*** Test Cases ***
Capture Login Page Baseline
    [Documentation]    Capture baseline screenshot of login page
    Open Browser    ${URL}    ${BROWSER}
    Set Window Size    1920    1080
    Sleep    1s    # Wait for page to fully render
    Capture Page Screenshot    ${SCREENSHOT_DIR}/login_baseline.png
    [Teardown]    Close Browser

Compare Login Page With Baseline
    [Documentation]    Compare current login page with baseline
    Open Browser    ${URL}    ${BROWSER}
    Set Window Size    1920    1080
    Sleep    1s    # Wait for page to fully render
    Capture Page Screenshot    ${SCREENSHOT_DIR}/login_current.png
    ${result}=    Run Process    python    ${CURDIR}/../test_scripts/compare_images.py    ${SCREENSHOT_DIR}/login_baseline.png    ${SCREENSHOT_DIR}/login_current.png
    Should Be Equal As Integers    ${result.rc}    0    Visual difference detected
    [Teardown]    Close Browser

Compare Dashboard Layout
    [Documentation]    Compare dashboard layout with baseline
    Open Browser    ${URL}/dashboard    ${BROWSER}
    Input Text    id=username    demo_user
    Input Password    id=password    demo_password
    Click Button    id=login-button
    Set Window Size    1920    1080
    Sleep    2s    # Wait for page to fully render
    Capture Page Screenshot    ${SCREENSHOT_DIR}/dashboard_current.png
    ${result}=    Run Process    python    ${CURDIR}/../test_scripts/compare_images.py    ${SCREENSHOT_DIR}/dashboard_baseline.png    ${SCREENSHOT_DIR}/dashboard_current.png
    Should Be Equal As Integers    ${result.rc}    0    Visual difference detected
    [Teardown]    Close Browser