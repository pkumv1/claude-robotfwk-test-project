*** Settings ***
Documentation    Performance and load testing suite
Library          SeleniumLibrary
Library          Process
Library          OperatingSystem
Library          DateTime

*** Variables ***
${BROWSER}        headlesschrome
${URL}            https://demo.example.com
${PERFORMANCE_DIR}  ${CURDIR}/../results/performance
${USERS}          10
${DURATION}       30

*** Test Cases ***
Response Time Test
    [Documentation]    Test response time for key pages
    Create Performance Directory
    Open Browser    ${URL}    ${BROWSER}
    
    # Measure login page load time
    ${start_time}=    Get Current Date    result_format=timestamp
    Go To    ${URL}
    ${end_time}=    Get Current Date    result_format=timestamp
    ${load_time}=    Subtract Date From Date    ${end_time}    ${start_time}    
    Log    Login page load time: ${load_time} seconds
    Record Page Load Time    login    ${load_time}
    
    # Authenticate
    Input Text    id=username    demo_user
    Input Password    id=password    demo_password
    ${start_time}=    Get Current Date    result_format=timestamp
    Click Button    id=login-button
    Wait Until Page Contains    Welcome    timeout=10s
    ${end_time}=    Get Current Date    result_format=timestamp
    ${auth_time}=    Subtract Date From Date    ${end_time}    ${start_time}
    Log    Authentication time: ${auth_time} seconds
    Record Page Load Time    authentication    ${auth_time}
    
    # Measure dashboard load time
    ${start_time}=    Get Current Date    result_format=timestamp
    Go To    ${URL}/dashboard
    Wait Until Page Contains    Dashboard    timeout=10s
    ${end_time}=    Get Current Date    result_format=timestamp
    ${dashboard_time}=    Subtract Date From Date    ${end_time}    ${start_time}
    Log    Dashboard load time: ${dashboard_time} seconds
    Record Page Load Time    dashboard    ${dashboard_time}
    
    # Measure profile page load time
    ${start_time}=    Get Current Date    result_format=timestamp
    Go To    ${URL}/profile
    Wait Until Page Contains    Profile    timeout=10s
    ${end_time}=    Get Current Date    result_format=timestamp
    ${profile_time}=    Subtract Date From Date    ${end_time}    ${start_time}
    Log    Profile load time: ${profile_time} seconds
    Record Page Load Time    profile    ${profile_time}
    
    # Analyze results
    Analyze Load Times
    [Teardown]    Close Browser

Run Load Test
    [Documentation]    Run a load test using k6
    ${result}=    Run Process    node    ${CURDIR}/../test_scripts/k6_load_test.js    ${URL}    ${USERS}    ${DURATION}
    Log    ${result.stdout}
    
    # Save results
    Create File    ${PERFORMANCE_DIR}/load-test-results.txt    ${result.stdout}
    
    # Check if test was successful
    Should Be Equal As Integers    ${result.rc}    0    Load test failure

Run Stress Test
    [Documentation]    Run a stress test using k6
    ${result}=    Run Process    node    ${CURDIR}/../test_scripts/k6_stress_test.js    ${URL}    ${USERS}
    Log    ${result.stdout}
    
    # Save results
    Create File    ${PERFORMANCE_DIR}/stress-test-results.txt    ${result.stdout}
    
    # Check if test was successful
    Should Be Equal As Integers    ${result.rc}    0    Stress test failure

*** Keywords ***
Create Performance Directory
    Create Directory    ${PERFORMANCE_DIR}

Record Page Load Time
    [Arguments]    ${page_name}    ${load_time}
    Append To File    ${PERFORMANCE_DIR}/page_load_times.csv    ${page_name},${load_time}\n

Analyze Load Times
    ${result}=    Run Process    node    ${CURDIR}/../test_scripts/analyze_load_times.js    ${PERFORMANCE_DIR}/page_load_times.csv
    Log    ${result.stdout}
    
    # Save analysis results
    Create File    ${PERFORMANCE_DIR}/load_time_analysis.json    ${result.stdout}