package buyer

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// HandleChatMessage receives chat prompts, routes reasoning to agent, and executes tools
func HandleChatMessage(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	response, err := ProcessAgentMessage(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI Agent failed to process message: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}
