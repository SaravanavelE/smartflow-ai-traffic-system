import os

from crewai import LLM
from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai_tools import (
	FileReadTool
)





@CrewBase
class SmartflowTrafficManagementSystemCrew:
    """SmartflowTrafficManagementSystem crew"""

    
    @agent
    def traffic_analyzer_agent(self) -> Agent:
        
        return Agent(
            config=self.agents_config["traffic_analyzer_agent"],
            
            
            tools=[				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                temperature=0.7,
                
            ),
            
        )
    
    @agent
    def prediction_agent(self) -> Agent:
        
        return Agent(
            config=self.agents_config["prediction_agent"],
            
            
            tools=[				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                temperature=0.7,
                
            ),
            
        )
    
    @agent
    def signal_optimization_agent(self) -> Agent:
        
        return Agent(
            config=self.agents_config["signal_optimization_agent"],
            
            
            tools=[				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                temperature=0.7,
                
            ),
            
        )
    
    @agent
    def emergency_agent(self) -> Agent:
        
        return Agent(
            config=self.agents_config["emergency_agent"],
            
            
            tools=[				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                temperature=0.7,
                
            ),
            
        )
    
    @agent
    def feedback_learning_agent(self) -> Agent:
        
        return Agent(
            config=self.agents_config["feedback_learning_agent"],
            
            
            tools=[				FileReadTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                temperature=0.7,
                
            ),
            
        )
    

    
    @task
    def analyze_real_time_traffic_data(self) -> Task:
        return Task(
            config=self.tasks_config["analyze_real_time_traffic_data"],
            markdown=False,
            
            
        )
    
    @task
    def detect_emergency_vehicles(self) -> Task:
        return Task(
            config=self.tasks_config["detect_emergency_vehicles"],
            markdown=False,
            
            
        )
    
    @task
    def generate_traffic_predictions(self) -> Task:
        return Task(
            config=self.tasks_config["generate_traffic_predictions"],
            markdown=False,
            
            
        )
    
    @task
    def optimize_signal_timing(self) -> Task:
        return Task(
            config=self.tasks_config["optimize_signal_timing"],
            markdown=False,
            
            
        )
    
    @task
    def process_system_feedback_and_learning(self) -> Task:
        return Task(
            config=self.tasks_config["process_system_feedback_and_learning"],
            markdown=False,
            
            
        )
    

    @crew
    def crew(self) -> Crew:
        """Creates the SmartflowTrafficManagementSystem crew"""
        return Crew(
            agents=self.agents,  # Automatically created by the @agent decorator
            tasks=self.tasks,  # Automatically created by the @task decorator
            process=Process.sequential,
            verbose=True,
            chat_llm=LLM(model="openai/gpt-4o-mini"),
        )


