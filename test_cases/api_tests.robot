*** Settings ***
Documentation    API testing suite
Library          RequestsLibrary
Library          Collections
Library          JSONLibrary

*** Variables ***
${API_URL}       https://api.example.com
${ENDPOINT}      /v1/users

*** Test Cases ***
Get User Data
    [Documentation]    Test retrieving user data via API
    Create Session    api_session    ${API_URL}
    ${response}=    GET On Session    api_session    ${ENDPOINT}/1
    Status Should Be    200    ${response}
    Dictionary Should Contain Key    ${response.json()}    name
    Dictionary Should Contain Key    ${response.json()}    email

Create New User
    [Documentation]    Test creating a new user via API
    Create Session    api_session    ${API_URL}
    &{headers}=    Create Dictionary    Content-Type=application/json
    &{data}=    Create Dictionary    name=Test User    email=test@example.com
    ${response}=    POST On Session    api_session    ${ENDPOINT}    json=${data}    headers=${headers}
    Status Should Be    201    ${response}
    Dictionary Should Contain Key    ${response.json()}    id

Update User Data
    [Documentation]    Test updating user data via API
    Create Session    api_session    ${API_URL}
    &{headers}=    Create Dictionary    Content-Type=application/json
    &{data}=    Create Dictionary    name=Updated Name
    ${response}=    PUT On Session    api_session    ${ENDPOINT}/1    json=${data}    headers=${headers}
    Status Should Be    200    ${response}
    Should Be Equal    ${response.json()}[name]    Updated Name

Delete User
    [Documentation]    Test deleting a user via API
    Create Session    api_session    ${API_URL}
    ${response}=    DELETE On Session    api_session    ${ENDPOINT}/1
    Status Should Be    204    ${response}